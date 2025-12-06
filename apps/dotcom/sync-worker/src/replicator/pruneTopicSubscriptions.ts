export const pruneTopicSubscriptionsSql = `
  -- Create temp table with all reachable topics
  CREATE TABLE reachable_topics AS
  WITH RECURSIVE reachable AS (
    -- Base case: all active user topics are reachable by definition
    SELECT ('user:' || id) as topic FROM active_user
    UNION
    -- Recursive case: topics reachable from already reachable topics
    SELECT ts.toTopic as topic
    FROM topic_subscription ts
    JOIN reachable r ON ts.fromTopic = r.topic
  )
  SELECT DISTINCT topic FROM reachable;
  
  -- Add index for fast lookups
  CREATE INDEX idx_reachable_topics ON reachable_topics(topic);
  
  -- Delete subscriptions where fromTopic is not reachable (this catches all orphaned subscriptions)
  DELETE FROM topic_subscription 
  WHERE NOT EXISTS (SELECT 1 FROM reachable_topics WHERE topic = topic_subscription.fromTopic);
  
  -- Clean up
  DROP TABLE reachable_topics;
`
