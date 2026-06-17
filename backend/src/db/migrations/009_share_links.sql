CREATE TABLE share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(128) NOT NULL UNIQUE,
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX share_links_token_idx ON share_links(token);
CREATE INDEX share_links_note_id_idx ON share_links(note_id);
