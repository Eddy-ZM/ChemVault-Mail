# Xcode Cloud Setup

This repository contains the native SwiftUI ChemVault Mail app:

`ChemVaultMailApple/ChemVaultMailApple.xcodeproj`

Use the shared scheme `ChemVaultMailApple` for iOS/iPadOS TestFlight builds. The `ChemVaultMailAppleMac` scheme is available for a separate macOS workflow.

## Before Enabling Xcode Cloud

Confirm these items in Apple Developer and App Store Connect:

- The App Store Connect app exists for ChemVault Mail.
- iOS Bundle ID is `science.chemvault.mail.apple`.
- macOS Bundle ID is `science.chemvault.mail.mac` if you enable a macOS workflow.
- The Apple Developer Team is `96L6379Q92`.
- Xcode/Apple Developer should show the signing account/name as `Ziwen Mu`.
- The Apple Developer Team is selected for the app target.
- Automatically manage signing is enabled.
- TestFlight is available for the iOS app record.
- App privacy, export compliance and required metadata are ready enough for upload processing.

Do not commit App Store Connect API keys, certificate private keys, provisioning profile private material, Cloudflare tokens, mail gateway secrets or `.env` files containing real values.

## Recommended iOS Workflow

- Trigger: push to the `main` branch.
- Scheme: `ChemVaultMailApple`.
- Action: Build.
- Archive: enabled.
- Distribution: TestFlight.
- Environment: latest stable Xcode available in Xcode Cloud.

## Optional macOS Workflow

- Trigger: manual or push to `main`.
- Scheme: `ChemVaultMailAppleMac`.
- Action: Build.
- Archive: enabled only after the macOS app record and signing are confirmed.

## First Success Criteria

- GitHub push starts Xcode Cloud automatically.
- The `ChemVaultMailApple` scheme builds and archives.
- App Store Connect receives the build.
- TestFlight can install the build.

## Notes

The app already includes remote configuration, maintenance mode, version checks and fallback defaults. If remote config is unavailable, the bundled default config should keep the app from crashing. Automatic signing uses Apple Developer Team `96L6379Q92`.
