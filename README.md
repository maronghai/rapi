# RESTful API for MySQL Database Querying

This project provides a simple RESTful API to query data from a MySQL database using Node.js, Express, and the mysql2 package. It allows users to send HTTP requests to dynamically build and execute SQL queries based on various parameters.

## Prerequisites

- Node.js >= 12.x
- MySQL server accessible and configured
- Optional: Docker for easier setup and deployment

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/maronghai/rapi.git
   ```

2. Install the dependencies:
   ```
   cd rapi
   npm install
   ```

3. Set the environment variables for your database configuration or update the `.env` file with your database details.

4. Start the server:
   ```
   node app.js
   ```

## Usage

The API provides a single endpoint `/api/tables/:table` where `:table` is the name of the table you wish to query from the database. The following query parameters are supported:

- `columns`: Comma-separated list of columns to select (default is `*` for all columns).
- `sort`: Comma-separated list of columns to sort by (prefix with `-` for descending order).
- `filter`: WHERE clause conditions (e.g., `[id][gt]=1`).
- `pno`: Page number for pagination (default is 1).
- `psize`: Page size for pagination (default is 10).

### Example Request

To query the `sys_user` table for users with an `id` greater than 1, sorting by `id` ascending and `name` descending, you can make the following request:

```
curl 'http://localhost:3005/api/tables/user?columns=id,name&sort=id,-name&filter[id][gt]=1'
```

This will generate the equivalent SQL query:

```sql
SELECT id, username FROM user WHERE id > 1 ORDER BY id, name DESC
```

## Contributing

Contributions are welcome! Please feel free to open issues or submit pull requests to improve the project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
