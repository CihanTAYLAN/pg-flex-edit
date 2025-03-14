**Prompt:**

**Project Title:** Pg-Flex-Edit: PostgreSQL Management Interface

**Objective:**
Develop a PostgreSQL management interface using **Next.js 14** that allows users to manage their database efficiently with minimal clicks. The application should store all relevant data in session storage, localStorage, or cookies instead of a separate database.

---

**Requirements:**

### General Requirements:

- The project should be built using **Next.js 14** with the **App Router** and **Server Actions** where applicable.
- Support **dark mode** and **light mode**, with user preference stored for persistence.
- On initial load, display a **modern welcome page** prompting the user to enter PostgreSQL connection details.
- Maintain an active connection session once the user inputs PostgreSQL credentials.
- Store session information using **sessionStorage, localStorage, or cookies**.
- Utilize **React Server Components (RSC)** where appropriate for optimized performance.
- Use **Tailwind CSS** for styling.

### User Session Management:

- After entering connection details, a session should be initiated and remain active as long as the user is interacting with the system.
- A **dashboard screen** will provide an overview of the connected PostgreSQL instance.
- A profile icon in the **top-right corner** should include a dropdown menu with:
  - Option to **add a new connection**.
  - Option to **switch between connections**.
  - Option to **delete connections**.

### PostgreSQL Management Panel:

- A **left sidebar** displaying a list of tables from the connected PostgreSQL database.
- Clicking on a table name navigates to the **Table Details Page**.

### Table Details Page:

- Two **tabs**:
  1. **Data Tab:**
     - Displays table data using **react-data-grid**.
     - Allows users to:
       - **Insert new rows**.
       - **Edit data dynamically** within the grid.
       - **Delete rows**.
  2. **Structure Tab:**
     - Displays table columns and schema (read-only view for now).
     - No modifications allowed in this version.

---

**Deliverables:**

- Next.js 14 project with **App Router** and **Server Actions**.
- PostgreSQL connection management with session persistence.
- Sidebar for table navigation.
- Table management UI using **react-data-grid**.
- Profile menu with connection management options.
- Dark mode & light mode support.
- Styling with **Tailwind CSS**.
- Usage of **React Server Components (RSC)** where beneficial.

**Notes:**

- The app should focus on **performance and minimal clicks** for common database operations.
- All stored data should be managed without a dedicated backend database.
