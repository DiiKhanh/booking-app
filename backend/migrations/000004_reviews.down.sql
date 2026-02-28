ALTER TABLE hotels
    DROP COLUMN IF EXISTS avg_rating,
    DROP COLUMN IF EXISTS review_count;

DROP TABLE IF EXISTS reviews;
