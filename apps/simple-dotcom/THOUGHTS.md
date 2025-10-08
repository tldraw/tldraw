# THOUGHTS.md

## Simplifying the Workspace Model: Scratchpad Instead of Private Workspaces

### Current Model

The application currently implements a private workspace system where:

- Each user gets a private workspace on signup (provisioned automatically)
- Private workspaces have special rules and constraints
- They cannot be deleted, renamed, or shared
- They require separate validation logic and permission handling
- Creates complexity in the codebase with `is_private` flags and special cases

### Proposed Simplified Model

Replace private workspaces with a single **scratchpad document** per user:

**Core Concept:**

- Every user gets one personal "Scratchpad" document on signup
- This document is always accessible and cannot be deleted
- All other workspaces follow the same rules - they are just "workspaces"
- No special workspace types, no `is_private` flag distinction
- Either the file cannot be shared, or perhaps its public url can be re-rolled by the user to prevent previously shared-with users from accessing it

### Benefits

1. **Reduced Complexity**
   - Eliminate special cases for private workspaces throughout the codebase
   - Remove `is_private` validation logic and constraints
   - Simplify workspace CRUD operations (no need to check if workspace is private)
   - Single set of rules for all workspaces

2. **Clearer Mental Model**
   - Users understand: "I have my scratchpad, and I can create/join workspaces"
   - No confusion about private vs shared workspaces
   - Workspace = always shareable by definition

3. **Database Simplification**
   - Remove or repurpose `is_private` column on workspaces
   - Could add `is_scratchpad` flag on documents instead (or identify by special property)
   - Fewer constraints and validation rules

4. **Better UX**
   - Scratchpad is always pinned/accessible (like a "quick notes" feature)
   - Users can create as many workspaces as they want for organization
   - All workspaces work the same way (create, rename, delete, share)

### Implementation Details

**Database Changes:**

- Keep `workspaces` table as-is but remove special handling of `is_private`
- Add scratchpad document on user signup:
  ```sql
  INSERT INTO documents (name, workspace_id, owner_id, is_scratchpad)
  VALUES ('Scratchpad', <first_workspace_id>, <user_id>, true)
  ```
- Or store scratchpad reference on user profile:
  ```sql
  ALTER TABLE users ADD COLUMN scratchpad_document_id UUID REFERENCES documents(id)
  ```

**UI Changes:**

- Dashboard shows scratchpad document prominently (always at top, or in header)
- "My Scratchpad" is always accessible from navigation
- Workspaces list shows only user-created/joined workspaces
- All workspaces can be renamed, deleted, shared (no exceptions)

**Auth/Signup Flow:**

- On signup, create first workspace (can be called "Personal" or default name)
- Create scratchpad document in that first workspace
- No concept of "private workspace" - just a regular workspace with one special document

**Permissions:**

- Scratchpad document: only accessible by owner, cannot be deleted or shared
- All workspaces: normal sharing rules apply
- Workspaces can be deleted by owner (no special private workspace constraint)

### Migration Path

**For Existing System:**

1. **Identify all private workspaces:**

   ```sql
   SELECT id, owner_id, name FROM workspaces WHERE is_private = true
   ```

2. **For each private workspace:**
   - Find the main document (or create one named "Scratchpad")
   - Mark that document as the user's scratchpad
   - Convert the private workspace to a regular workspace, or
   - Delete the private workspace and move scratchpad to a new/existing workspace

3. **Update code:**
   - Remove `is_private` checks from workspace validation
   - Remove private workspace creation on signup
   - Add scratchpad document creation on signup
   - Update UI to show scratchpad prominently
   - Remove constraints preventing private workspace deletion/rename

### Open Questions

1. **Where does the scratchpad live?**
   - Option A: In user's first workspace (simpler, scratchpad is just a special document)
   - Option B: In a special "Personal" workspace that's auto-created but acts like any other workspace
   - Option C: Not in any workspace (requires schema change, document without workspace_id)

2. **What happens to existing private workspace content?**
   - Documents in old private workspaces get migrated to new scratchpad document?
   - Or keep the workspace, just remove the "private" special status?

3. **Scratchpad naming:**
   - Fixed name "Scratchpad" or user-customizable?
   - Allow renaming but not deletion?

4. **Multiple scratchpads?**
   - Stick to one scratchpad per user (simpler)
   - Or allow users to create additional "private documents" in any workspace?

### Alternative: Keep Workspaces, Simplify Rules

Instead of scratchpad, we could simplify by:

- Remove the distinction between private and shared workspaces entirely
- All workspaces work the same way
- User's first workspace is just a regular workspace they create on signup
- No special rules at all

**Trade-off:** Users lose the guaranteed "private space", but gain simplicity and flexibility.

### Recommendation

The scratchpad model seems like the best middle ground:

- Users get a guaranteed private space (single document)
- All workspace complexity goes away
- Simpler codebase, clearer mental model
- Easy to implement and migrate

The only question is whether a single scratchpad document is sufficient for users' private note needs, or if they'll want more organization (multiple private docs, folders, etc.). If the latter, maybe we keep workspaces but remove the `is_private` distinction entirely and just let users choose not to share specific workspaces.

---

I think it might be better to have not a Next.js site for this, and instead have a beat site with a client state manager that is just setting up all the queries that matter for this user and then syncing those queries into some sort of reactive store. Tealdra's state is a good example of this sort of reactive store, but it could just as easily be like Zustand or something else. We wouldn't do any optimistic updates; we would just update the server. React does have some like use optimistic state and other things that we could use to not just delay the user every time they submit something. Hope would be you should set it up in such a way that new subscriptions every time that it user navigates around that it would just constantly be updating the picture of what the client's data is based on whatever is on the server. That said, I think we could also just make it work for you know, using Next.js. I can pretty sure there are ways to make this happen, but if not, then I think we have to think of something else for the next time.
