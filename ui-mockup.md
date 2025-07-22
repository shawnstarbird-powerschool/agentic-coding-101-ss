# Description

You are an expert at writing react UIs that use the neon-design-system (as described in the document in package-docs) and also make backend calls to the server defined by the `BFFApi` construct in main-stack.ts (for more on BFFApi see the bff-api.doc.md file).

You are writing a user administration tool. You will product react components designed for use in a router. The top-level page will be the user list page. Every page will use the neon design system and will show up as pages in the router. All tables will use the neon table style `__neon__table-simple`.

# Pages

## User List

The top-level page is a list of all the users in the district. The data is pulled from the list users API. The page will also have a header that consists of two menu items: "Users" (which is highlighted and not clickable) and "Folders" (which is clickable and take you to the "Folder List" page).

### Mockup

[New User](#Create User)

| Username | Type     | Product | Home Directory | Access    | IPs        | Last login | Actions                                       |
| -------- | -------- | ------- | -------------- | --------- | ---------- | ---------- | --------------------------------------------- |
| user1    | SSH key  | PM      | /enroll        | Read      | 0.0.0.0/0  | 1/2/2025   | [Edit](#Edit User) [Inactivate](#Delete User) |
| user2    | Password | PM      | /scan          | Write     | 1.2.3.4/32 | 3/1/2025   | [Edit](#Edit User) [Inactivate](#Delete User) |
| user3    | Password | SGY     | /usage         | Readwrite | 1.2.3.4/32 | 4/1/2025   | [Edit](#Edit User) [Inactivate](#Delete User) |

## Create User

The create user page lets the user create a system user.

### Content description

It has form fields for the following fields in the User entity:

- username (required) - a username entered by the admin user
- authenticationType (required) - required, either "Password" or "SSH key"
  - If the user chooses "Password", show a popup that generates a cryptographically secure password. The user should be able to choose the length (at least 10) and whether it's pronounceable or not. If pronounceable, generate the password as a series of two-letter combinations of a consonant and a vowel. Also display the password. The user should be able to accept it or choose another. After generation, go back to the page and display the first and last 2 characters, with dashes for the rest. Provide buttons to view (then show it) or regenerate it (then go to the popup again). The user cannot enter a password themselves to keep it secure.
  - If "SSH key", show a popup that allows pasting an RSA public key string and a "Save" button. After this, display three stars, and an "Update" button. You should check to make sure it looks like a public key and not a private key and give the user an error in the popup if they paste a private key.
- access (required) - a pulldown with "read", "write", or "readwrite"
- productCode (required) - make an API call to get the set of products and keep them. Display a pulldown so the user can choose a product.
- folders (required) - depending on the product the user chooses, display a multi-select that has the available folders. The user can pick one or more. They have to choose at least one.
- ipWhitelist (optional) - a text area that allows entering IP addresses or CIDR ranges for a whitelist. Can be newline or comma-separated.

Has buttons for "Save" or "Cancel". Both take you back to the list page, which refreshes.

## Edit User

This is a form page basically the same as Create User, except pre-populated with the information from the API.

Has buttons for "Save" or "Cancel". Both go back to the list page, which refreshes.

## Folder List

This page is a list of all the folders in the district. The data is pulled from the list folders API. The page will also have a header that consists of two menu items: "Users" (which is clickable and take you to the "User List" page) and "Folders" (which is highlighted and not clickable).

### Mockup

[New Folder](#Create Folder)

| Product | Type            | Directory | Access   | Actions              |
| ------- | --------------- | --------- | -------- | -------------------- |
| PM      | Enrollment      | /enroll   | Inbound  | [Edit](#Edit Folder) |
| PM      | Scan            | /scan     | Inbound  | [Edit](#Edit Folder) |
| SGY     | Usage Analytics | /usage    | Outbound | [Edit](#Edit Folder) |

## Create Folder

The create folder page lets the user create a system user.

### Content description

It has form fields for the following fields in the Folder entity:

- productCode (required) - make an API call to get the set of products and keep them. Display a pulldown so the user can choose a product.
- use (required) - lets the use pick a "use", which are returned from the get product API
- directory (required) - a text entry with the specific folder path
- access (required) - either "inbound" or "outbound"

Has buttons for "Save" or "Cancel". Both take you back to the Folders list page, which refreshes.

## Edit Folder

This is a form page basically the same as Create Folder, except pre-populated with the information from the API.

Has buttons for "Save" or "Cancel". Both go back to the Folder list page, which refreshes.
