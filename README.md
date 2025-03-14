# Pg-Flex-Edit: PostgreSQL Management Interface

A modern PostgreSQL management interface built with Next.js 14, allowing users to manage their database efficiently with minimal clicks.

## Features

- **Modern UI**: Clean and responsive interface with dark/light mode support
- **Connection Management**: Save, switch between, and delete database connections
- **Table Navigation**: Browse tables in your PostgreSQL database
- **Data Management**: View, add, edit, and delete rows in your tables
- **Table Structure**: View table schema and column details

## Technologies Used

- **Next.js 14** with App Router and Server Actions
- **React Server Components (RSC)** for optimized performance
- **Tailwind CSS** for styling
- **react-data-grid** for table data management
- **PostgreSQL** client for database connectivity
- **Local Storage** for connection persistence

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- Yarn package manager
- PostgreSQL database

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/pg-flex-edit.git
   cd pg-flex-edit
   ```

2. Install dependencies:

   ```bash
   yarn install
   ```

3. Start the development server:

   ```bash
   yarn dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Enter your PostgreSQL connection details on the welcome page
2. Browse your database tables in the sidebar
3. Click on a table to view and manage its data
4. Use the tabs to switch between data view and structure view
5. Add, edit, or delete rows in the data view

## License

MIT
