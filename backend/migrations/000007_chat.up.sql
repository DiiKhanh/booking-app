CREATE TABLE conversations (
    id              BIGSERIAL PRIMARY KEY,
    type            VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'broadcast')),
    hotel_id        INT REFERENCES hotels(id) ON DELETE SET NULL,
    booking_id      INT REFERENCES bookings(id) ON DELETE SET NULL,
    participant_a   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant_b   UUID REFERENCES users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_direct_conversation UNIQUE (participant_a, participant_b, hotel_id)
);

CREATE TABLE messages (
    id              BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_participant_a ON conversations(participant_a);
CREATE INDEX idx_conversations_participant_b ON conversations(participant_b) WHERE participant_b IS NOT NULL;
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_unread ON messages(conversation_id, is_read) WHERE is_read = FALSE;
