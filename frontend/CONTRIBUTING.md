# Contributing to CourseCompass

First off, thank you for considering contributing to CourseCompass! Your help is essential for making this project the best it can be.

This document provides guidelines for contributing to the project, ensuring a smooth and consistent development process.

## 💻 Development Process

We follow a process inspired by GitHub Flow. All changes are made through pull requests.

### Branching

1.  **`main` branch:** This branch is for production-ready code only. All pull requests must be merged into `develop` before being considered for `main`.
2.  **`develop` branch:** This is the primary development branch. All feature branches should be based on `develop`.
3.  **Feature branches:** Create a new branch for each new feature or bug fix. Branch names should be descriptive and follow this convention:
    *   `feature/<feature-name>` (e.g., `feature/course-enrollment`)
    *   `bugfix/<bug-name>` (e.g., `bugfix/login-error`)
    *   `chore/<task-name>` (e.g., `chore/update-dependencies`)

### Pull Requests (PRs)

*   Before creating a PR, ensure your code is well-tested and adheres to the project's coding standards.
*   PRs should be small and focused on a single feature or bug fix.
*   Provide a clear and descriptive title and description for your PR, explaining the "what" and "why" of your changes.
*   Link to any relevant issues in your PR description.
*   Ensure your branch is up-to-date with the `develop` branch before submitting your PR.

## ✅ Definition of Done

For a feature or bug fix to be considered "done," it must meet the following criteria:

*   **Functionality:** All acceptance criteria for the feature are met.
*   **Code Quality:**
    *   Code is well-documented, especially for complex logic.
    *   The code adheres to the project's linting and formatting standards.
    *   No new linting or type-checking errors are introduced.
*   **Testing:**
    *   Unit and/or integration tests are written and passing (aim for >80% code coverage for new code).
    *   All existing tests are still passing.
*   **Accessibility:** The feature is tested for accessibility and complies with WCAG 2.1 AA standards.
*   **Peer Review:** The changes have been peer-reviewed and approved by at least one other developer.
*   **Branch Merged:** The feature branch has been successfully merged into the `develop` branch.

## 🎨 Coding Style

*   **Consistency:** Follow the existing coding style and conventions used in the project.
*   **Formatting:** We use Prettier for automatic code formatting. Please ensure it is run on your code before committing.
*   **Linting:** We use ESLint for identifying and fixing problems in our JavaScript/TypeScript code. Please ensure there are no linting errors before creating a PR.
*   **Naming:** Use clear and descriptive names for variables, functions, and classes.

## ♿ Accessibility First

We are committed to making CourseCompass accessible to everyone. All new features and UI components must be designed and built with accessibility in mind.

*   Use semantic HTML5 elements.
*   Ensure all interactive elements are accessible via keyboard.
*   Use ARIA labels and roles where necessary.
*   Test for sufficient color contrast.
*   Provide alt text for all meaningful images.

By following these guidelines, we can work together to build a high-quality, robust, and accessible learning platform. Thank you for your contribution!
