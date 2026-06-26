import SwiftUI

struct ForceUpdateView: View {
    @Environment(\.openURL) private var openURL
    @Environment(\.colorScheme) private var colorScheme
    let version: AppVersion

    var body: some View {
        ZStack {
            ChemVaultWorkspaceBackground()

            VStack(spacing: 18) {
                Image(systemName: "arrow.down.app.fill")
                    .font(.system(size: 56, weight: .semibold))
                    .foregroundStyle(ChemVaultLoadingConfiguration.primaryColor(for: colorScheme))

                VStack(spacing: 8) {
                    Text("Update Required")
                        .font(.title2.weight(.semibold))
                    Text("ChemVault Mail \(version.latestVersion) is required to continue.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }

                Button {
                    openAppStore()
                } label: {
                    Label("Update", systemImage: "arrow.up.forward.app")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(ChemVaultPrimaryButtonStyle())
            }
            .padding(26)
            .frame(maxWidth: 420)
            .background(ChemVaultWorkspaceTheme.panelBackground(for: colorScheme), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .stroke(ChemVaultWorkspaceTheme.panelStroke(for: colorScheme), lineWidth: 1)
            }
            .padding()
        }
    }

    private func openAppStore() {
        guard URLValidator.isAppStoreURL(version.appStoreUrl),
              let url = URL(string: version.appStoreUrl) else {
            return
        }
        openURL(url)
    }
}
