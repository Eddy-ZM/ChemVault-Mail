import SwiftUI

struct AnnouncementBannerView: View {
    @Environment(\.openURL) private var openURL
    @Environment(\.colorScheme) private var colorScheme
    let announcement: Announcement
    let dismiss: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: "megaphone.fill")
                    .foregroundStyle(ChemVaultLoadingConfiguration.primaryColor(for: colorScheme))

                VStack(alignment: .leading, spacing: 4) {
                    if !announcement.title.isEmpty {
                        Text(announcement.title)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(ChemVaultTheme.brandText(for: colorScheme))
                    }
                    if !announcement.message.isEmpty {
                        Text(announcement.message)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer(minLength: 8)

                Button(action: dismiss) {
                    Image(systemName: "xmark")
                        .font(.caption.weight(.bold))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Dismiss announcement")
            }

            if let link = announcement.link,
               URLValidator.isAllowedWebContentURL(link),
               let url = URL(string: link) {
                Button {
                    openURL(url)
                } label: {
                    Label("Open", systemImage: "arrow.up.right")
                        .font(.caption.weight(.semibold))
                }
                .buttonStyle(.borderless)
            }
        }
        .padding(14)
        .background(ChemVaultLoadingConfiguration.primaryColor(for: colorScheme).opacity(colorScheme == .dark ? 0.16 : 0.1), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(ChemVaultLoadingConfiguration.primaryColor(for: colorScheme).opacity(0.22), lineWidth: 1)
        }
    }
}
