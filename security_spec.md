# Security Specification: Book Library App

## Data Invariants
1. A book record must always have a `userId` that matches the authenticated user.
2. A book record must have a non-empty `title`.
3. Reading status must be one of: 'Ongelezen', 'Bezig', 'Gelezen', 'Wil ik lezen'.
4. User profiles can only be accessed and modified by the owner.

## The "Dirty Dozen" Payloads (Create/Update Failures)
1. Creating a book for another user: `{ "userId": "victim_uid", "title": "Stolen" }`
2. Creating a book with no title: `{ "userId": "own_uid", "title": "" }`
3. Creating a book with invalid status: `{ "userId": "own_uid", "title": "Test", "readingStatus": "Invalid" }`
4. Creating a book with a 2MB description (resource exhaustion).
5. Updating a book's `userId` to someone else's.
6. Updating a user profile that doesn't belong to the requester.
7. Attempting to list all books without a `where` clause (query scraping).
8. Injecting a massive array into `authors`.
9. Setting a negative rating.
10. Modifying `dateAdded` after creation.
11. Adding shadow fields (e.g., ` isAdmin: true `).
12. Creating a book with a spoofed email (if email is used in rules).

## Test Runner
(Abstractly verified against rules logic below)
