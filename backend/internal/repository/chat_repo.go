package repository

import (
	"booking-app/internal/domain"
	"context"
	"database/sql"
	"fmt"
	"time"
)

// ChatRepo handles all database operations for conversations and messages.
type ChatRepo struct {
	db *sql.DB
}

// NewChatRepo creates a new ChatRepo.
func NewChatRepo(db *sql.DB) *ChatRepo {
	return &ChatRepo{db: db}
}

// CreateConversation inserts a new conversation and returns it with the generated id and created_at.
func (r *ChatRepo) CreateConversation(ctx context.Context, conv *domain.Conversation) (*domain.Conversation, error) {
	result := *conv
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO conversations (type, hotel_id, booking_id, participant_a, participant_b, last_message_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at
	`, string(conv.Type), conv.HotelID, conv.BookingID, conv.ParticipantA, conv.ParticipantB, conv.LastMessageAt).
		Scan(&result.ID, &result.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert conversation: %w", err)
	}
	return &result, nil
}

// GetConversationByID fetches a single conversation by its primary key.
func (r *ChatRepo) GetConversationByID(ctx context.Context, id int64) (*domain.Conversation, error) {
	c := &domain.Conversation{}
	err := r.db.QueryRowContext(ctx, `
		SELECT id, type, hotel_id, booking_id, participant_a, participant_b, last_message_at, created_at
		FROM conversations WHERE id = $1
	`, id).Scan(
		&c.ID, &c.Type, &c.HotelID, &c.BookingID,
		&c.ParticipantA, &c.ParticipantB, &c.LastMessageAt, &c.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get conversation by id: %w", err)
	}
	return c, nil
}

// FindDirectConversation finds an existing direct conversation between two participants,
// optionally scoped to a hotel. Returns ErrNotFound if no such conversation exists.
func (r *ChatRepo) FindDirectConversation(ctx context.Context, participantA, participantB string, hotelID *int) (*domain.Conversation, error) {
	c := &domain.Conversation{}
	err := r.db.QueryRowContext(ctx, `
		SELECT id, type, hotel_id, booking_id, participant_a, participant_b, last_message_at, created_at
		FROM conversations
		WHERE type = 'direct'
		  AND (
		        (participant_a = $1 AND participant_b = $2)
		     OR (participant_a = $2 AND participant_b = $1)
		      )
		  AND (($3::int IS NULL AND hotel_id IS NULL) OR hotel_id = $3)
		LIMIT 1
	`, participantA, participantB, hotelID).Scan(
		&c.ID, &c.Type, &c.HotelID, &c.BookingID,
		&c.ParticipantA, &c.ParticipantB, &c.LastMessageAt, &c.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("find direct conversation: %w", err)
	}
	return c, nil
}

// ListConversationsByUser returns paginated conversations for a user, sorted by last_message_at DESC.
func (r *ChatRepo) ListConversationsByUser(ctx context.Context, userID string, page, limit int) ([]*domain.Conversation, int, error) {
	offset := (page - 1) * limit

	var total int
	if err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM conversations WHERE participant_a = $1 OR participant_b = $1`,
		userID,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count conversations by user: %w", err)
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT id, type, hotel_id, booking_id, participant_a, participant_b, last_message_at, created_at
		FROM conversations
		WHERE participant_a = $1 OR participant_b = $1
		ORDER BY last_message_at DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list conversations by user: %w", err)
	}
	defer rows.Close()

	var convs []*domain.Conversation
	for rows.Next() {
		c := &domain.Conversation{}
		if err := rows.Scan(
			&c.ID, &c.Type, &c.HotelID, &c.BookingID,
			&c.ParticipantA, &c.ParticipantB, &c.LastMessageAt, &c.CreatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan conversation row: %w", err)
		}
		convs = append(convs, c)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate conversation rows: %w", err)
	}

	if convs == nil {
		convs = []*domain.Conversation{}
	}
	return convs, total, nil
}

// UpdateLastMessageAt updates the last_message_at timestamp of a conversation.
func (r *ChatRepo) UpdateLastMessageAt(ctx context.Context, conversationID int64, at time.Time) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE conversations SET last_message_at = $1 WHERE id = $2`,
		at, conversationID,
	)
	if err != nil {
		return fmt.Errorf("update last_message_at: %w", err)
	}
	return nil
}

// CreateMessage inserts a new message and returns it with the generated id, is_read, and created_at.
func (r *ChatRepo) CreateMessage(ctx context.Context, msg *domain.Message) (*domain.Message, error) {
	result := *msg
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO messages (conversation_id, sender_id, content)
		VALUES ($1, $2, $3)
		RETURNING id, is_read, created_at
	`, msg.ConversationID, msg.SenderID, msg.Content).
		Scan(&result.ID, &result.IsRead, &result.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert message: %w", err)
	}
	return &result, nil
}

// ListMessagesByConversation returns messages for a conversation using cursor-based pagination.
// If beforeID is non-nil, only messages with id < beforeID are returned (older messages).
// Results are ordered by id DESC (newest first within the page).
func (r *ChatRepo) ListMessagesByConversation(ctx context.Context, conversationID int64, beforeID *int64, limit int) ([]*domain.Message, error) {
	var (
		rows *sql.Rows
		err  error
	)
	if beforeID != nil {
		rows, err = r.db.QueryContext(ctx, `
			SELECT id, conversation_id, sender_id, content, is_read, created_at
			FROM messages
			WHERE conversation_id = $1 AND id < $2
			ORDER BY id DESC
			LIMIT $3
		`, conversationID, *beforeID, limit)
	} else {
		rows, err = r.db.QueryContext(ctx, `
			SELECT id, conversation_id, sender_id, content, is_read, created_at
			FROM messages
			WHERE conversation_id = $1
			ORDER BY id DESC
			LIMIT $2
		`, conversationID, limit)
	}
	if err != nil {
		return nil, fmt.Errorf("list messages by conversation: %w", err)
	}
	defer rows.Close()

	var msgs []*domain.Message
	for rows.Next() {
		m := &domain.Message{}
		if err := rows.Scan(&m.ID, &m.ConversationID, &m.SenderID, &m.Content, &m.IsRead, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan message row: %w", err)
		}
		msgs = append(msgs, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate message rows: %w", err)
	}

	if msgs == nil {
		msgs = []*domain.Message{}
	}
	return msgs, nil
}

// MarkMessagesRead marks all unread messages in a conversation as read, excluding the user's own messages.
func (r *ChatRepo) MarkMessagesRead(ctx context.Context, conversationID int64, userID string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE messages SET is_read = true
		 WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false`,
		conversationID, userID,
	)
	if err != nil {
		return fmt.Errorf("mark messages read: %w", err)
	}
	return nil
}

// GetUnreadCountByConversation returns the count of unread messages sent by others in a conversation.
func (r *ChatRepo) GetUnreadCountByConversation(ctx context.Context, conversationID int64, userID string) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM messages
		 WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false`,
		conversationID, userID,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("get unread count by conversation: %w", err)
	}
	return count, nil
}

// GetTotalUnreadCount returns the total unread message count for a user across all their conversations.
func (r *ChatRepo) GetTotalUnreadCount(ctx context.Context, userID string) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(m.id)
		FROM messages m
		JOIN conversations c ON c.id = m.conversation_id
		WHERE (c.participant_a = $1 OR c.participant_b = $1)
		  AND m.sender_id != $1
		  AND m.is_read = false
	`, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("get total unread count: %w", err)
	}
	return count, nil
}

// GetLastMessage returns the most recent message in a conversation.
// Returns ErrNotFound if the conversation has no messages.
func (r *ChatRepo) GetLastMessage(ctx context.Context, conversationID int64) (*domain.Message, error) {
	m := &domain.Message{}
	err := r.db.QueryRowContext(ctx, `
		SELECT id, conversation_id, sender_id, content, is_read, created_at
		FROM messages
		WHERE conversation_id = $1
		ORDER BY id DESC
		LIMIT 1
	`, conversationID).Scan(&m.ID, &m.ConversationID, &m.SenderID, &m.Content, &m.IsRead, &m.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get last message: %w", err)
	}
	return m, nil
}
