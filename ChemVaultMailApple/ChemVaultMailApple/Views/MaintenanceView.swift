import SwiftUI

struct MaintenanceView: View {
    @Environment(\.openURL) private var openURL
    @Environment(\.colorScheme) private var colorScheme
    let title: String
    let message: String
    let supportEmail: String
    let helpCenterUrl: String
    let retry: () -> Void

    var body: some View {
        ZStack {
            ChemVaultWorkspaceBackground()

            VStack(spacing: 18) {
                Image(systemName: "wrench.and.screwdriver.fill")
                    .font(.system(size: 54, weight: .semibold))
                    .foregroundStyle(ChemVaultLoadingConfiguration.primaryColor(for: colorScheme))

                VStack(spacing: 8) {
                    Text(title)
                        .font(.title2.weight(.semibold))
                    Text(message)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }

                HStack(spacing: 12) {
                    Button(action: retry) {
                        Label("Retry", systemImage: "arrow.clockwise")
                    }
                    .buttonStyle(ChemVaultPrimaryButtonStyle())

                    Button {
                        openSupport()
                    } label: {
                        Label("Support", systemImage: "questionmark.circle")
                    }
                    .buttonStyle(.bordered)
                }
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

    private func openSupport() {
        if let url = URL(string: "mailto:\(supportEmail)") {
            openURL(url)
        } else if let url = URLValidator.parsedHTTPSURL(helpCenterUrl) {
            openURL(url)
        }
    }
}
