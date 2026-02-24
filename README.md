# Sleeplay Dashboard — Team Training

A simple, Trainual/Notion-style dashboard to store and manage your Standard Operating Procedures (SOPs) and train your team.

## How to use

1. **Run the website (recommended)**  
   In Terminal, from this folder run:
   ```bash
   ./start.sh
   ```
   Then open **http://localhost:8080/** in your browser. **Bookmark this URL** — the app always uses port 8080, so the link won’t change. If port 8080 is already in use, quit the other app using it, or edit `start.sh` to use another port (e.g. `8081`).

2. **Or open the file directly**  
   Double-click `index.html` or open it in your browser. Some features work best when using the URL above instead.

2. **Create SOPs**  
   Click **+ New SOP** in the sidebar (or **Create your first SOP** when empty). Add a title and write your procedure in the content area. Changes are saved automatically.

3. **Organize with categories**  
   Use the default categories (Onboarding, Operations, Support, Sales) or click **+** next to "Categories" to add your own. Filter the list by clicking a category in the sidebar.

4. **Search**  
   Use the search bar to find SOPs by title or content.

5. **Edit or delete**  
   Open any SOP to edit. Use **Delete** in the toolbar to remove it (with confirmation).

## Where is my data stored?

All SOPs and categories are saved in your browser’s **localStorage**. No server or account is required. Data stays on your device and persists between sessions.

**Tip:** To back up or move your SOPs, use your browser’s developer tools (Application → Local Storage) to copy the values for `sop-dashboard-sops` and `sop-dashboard-categories`.

## Sharing with your team

- **Same computer:** Anyone using this browser profile will see the same SOPs.
- **Other devices:** Host `index.html` (and `styles.css`, `app.js`) on a web server or intranet so your team can open the same URL. Each browser/device will have its own localStorage unless you add a backend later.

Enjoy training your team with clear, consistent SOPs.
