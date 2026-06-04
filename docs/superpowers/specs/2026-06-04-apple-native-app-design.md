# ChemVault Mail Apple Native App Design

## Goal

Build a native Apple ecosystem version of ChemVault Mail as a SwiftUI Universal App for iPhone, iPad, and macOS. The app must connect to the existing Cloudflare Worker backend, default to `https://mail.chemvault.science`, and eventually cover the full web feature set without using WebView as the primary app shell.

## Scope

The native app will cover:

- Authentication: login, logout, registration, token persistence, and session recovery.
- Mail client: inbox, starred mail, message reading, delete, mark read, latest-mail polling, compose, reply, forward, CC/BCC, and attachments.
- Accounts: account list, add account, rename, avatar, all-receive toggle, pin-to-top, and delete.
- Settings: personal account settings, password reset, language, base API URL override, website/system settings, background settings, and blacklist settings.
- Administration: users, user accounts, roles, permission tree, registration keys, all-mail management, and batch delete operations.
- Analytics: native Swift Charts replacements for the existing ECharts dashboard.

The first implementation phase must produce a buildable Universal App with the shared architecture, authentication, mail list/detail/compose foundations, account/settings shells, and admin/analytics navigation in place. Later phases fill each admin operation behind the same API client and model layer.

## Architecture

Create a new `ChemVaultMailApple` SwiftUI project inside the repository. It will be a Universal App using SwiftUI for iOS, iPadOS, and macOS with shared source files. Platform differences stay in layout and scene composition, not in duplicated business logic.

The app is split into:

- `App`: app entry point, scene routing, command wiring, and root dependency injection.
- `Core`: API client, endpoint definitions, result envelope decoding, auth session, keychain storage, user preferences, errors, and formatters.
- `Models`: Codable data models matching the Worker entities and API responses.
- `Features`: feature modules for auth, mail, compose, accounts, settings, admin, and analytics.
- `PreviewSupport`: mock data and mock API services for SwiftUI previews and tests.
- `Tests`: model decoding and API request construction tests.

## API Integration

The native client calls the existing Worker JSON API directly. It uses the same response envelope as the web client:

```json
{ "code": 200, "message": "success", "data": {} }
```

Requests include:

- `Authorization: <token>` after login.
- `accept-language: zh` or `en` from app settings.
- JSON request and response bodies unless an endpoint returns raw R2 object data.

The default API base URL is `https://mail.chemvault.science`. Settings allow overriding the base URL for development or private deployments. The override is persisted in app storage and applied at the next request.

## Authentication And Storage

The login token is stored in Keychain. The app keeps a small in-memory session state for the current token, selected language, and current user. On launch, the app reads Keychain and attempts to load `/my/loginUserInfo`. A `401` response clears the token and returns the user to login.

Passwords are never persisted. Registration uses the existing `/register` endpoint and stores the returned token if the backend returns one.

## UI Design

iPhone uses a native mail-client flow:

- Tab or sidebar entry points for Mail, Starred, Accounts, Settings, Admin, and Analytics.
- `NavigationStack` for list-to-detail flows.
- Compose presented as a sheet.

iPad and macOS use a denser native layout:

- `NavigationSplitView` with module sidebar, mail/account list, and detail panel.
- Toolbar actions for refresh, compose, delete, star, reply, forward, and settings.
- macOS adds menu commands and keyboard shortcuts for common actions.

Mail HTML content is rendered in a constrained platform WebView component only for message bodies. The WebView is not used as the app shell. External links open through the system browser. Attachments open through native download and preview surfaces.

## Error Handling

The API client maps Worker codes into typed errors:

- `401`: clear session and show login.
- `403`: show permission denial in the current module.
- `502`: display the HTML-capable server message as plain text or a controlled attributed message.
- Other non-200 codes: show the backend message.
- Transport errors: show network or timeout feedback and keep the current state.

Destructive actions use confirmation dialogs. Empty lists, loading states, and retry states are explicit in each module.

## Analytics

The native analytics module calls `/analysis/echarts` but does not embed ECharts. It maps the returned series data into Swift Charts datasets. The first version displays summary cards and time-series charts; later refinements can add filters and platform-specific export.

## Testing

Tests focus on stable shared logic:

- Envelope decoding for success and error responses.
- Model decoding for email, account, user, role, registration key, settings, and analytics payloads.
- API request construction for auth headers, language headers, query parameters, and JSON bodies.
- Auth session behavior when token exists, expires, or login succeeds.

The app must pass `xcodebuild` or SwiftPM-equivalent build validation before it is considered complete for a phase.

## Delivery Strategy

Deliver in stages while keeping the final target as a full native app:

1. Scaffold a buildable Universal App with shared source organization and build scripts.
2. Implement API client, auth session, Keychain storage, settings, and mock data.
3. Implement login and registration.
4. Implement mail list, starred list, message detail, delete, read, latest polling, and compose foundation.
5. Implement account and personal settings.
6. Implement admin modules for users, roles, registration keys, all-mail management, and system settings.
7. Implement analytics with Swift Charts.
8. Add deeper platform polish: macOS commands, iPad split view behavior, attachment previews, keyboard shortcuts, and accessibility labels.

