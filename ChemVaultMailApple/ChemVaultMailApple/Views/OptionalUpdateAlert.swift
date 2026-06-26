import SwiftUI

struct OptionalUpdateAlert: ViewModifier {
    @Environment(\.openURL) private var openURL
    @Binding var version: AppVersion?

    func body(content: Content) -> some View {
        content.alert(item: $version) { version in
            Alert(
                title: Text("Update Available"),
                message: Text("ChemVault Mail \(version.latestVersion) is available."),
                primaryButton: .default(Text("Update Now")) {
                    guard URLValidator.isAppStoreURL(version.appStoreUrl),
                          let url = URL(string: version.appStoreUrl) else {
                        return
                    }
                    openURL(url)
                },
                secondaryButton: .cancel(Text("Later"))
            )
        }
    }
}

extension View {
    func optionalUpdateAlert(version: Binding<AppVersion?>) -> some View {
        modifier(OptionalUpdateAlert(version: version))
    }
}
