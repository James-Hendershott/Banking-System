# Banking-System

Full-stack banking application built for CS 3650. 119 commits of my own code — no AI assistance.

## What it does

- Complete banking system with account management, transfers, deposits, and withdrawals
- Role-based authentication: admin, employee, and customer access levels
- Financial transactions with overdraft protection
- MySQL stored procedures handle core banking logic server-side
- Admin dashboard for user and account management

## Tech

- **Backend:** Node.js, Express
- **Database:** MySQL with stored procedures
- **Views:** EJS templates
- **Auth:** Session-based with role-based access control

## Architecture

The database does the heavy lifting. Stored procedures handle transaction logic, balance validation, and overdraft checks. This was a deliberate design choice — financial operations need to be atomic and consistent, and pushing that logic to the database layer makes that easier to guarantee.

## Honesty

119 commits over the semester. Every line is mine. No AI, no starter code beyond basic Express setup from lectures. This is the project I point to when someone asks "can you actually code?"
