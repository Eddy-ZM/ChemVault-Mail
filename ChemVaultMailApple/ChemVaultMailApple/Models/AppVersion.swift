import Foundation

struct AppVersion: Identifiable, Equatable {
    enum UpdateKind: Equatable {
        case optional
        case forced
    }

    var currentVersion: String
    var latestVersion: String
    var minimumSupportedVersion: String
    var appStoreUrl: String
    var kind: UpdateKind

    var id: String {
        "\(kind)-\(latestVersion)-\(minimumSupportedVersion)"
    }
}

enum LaunchBlock: Identifiable, Equatable {
    case maintenance(title: String, message: String, supportEmail: String, helpCenterUrl: String)
    case forceUpdate(AppVersion)

    var id: String {
        switch self {
        case .maintenance(let title, let message, _, _):
            return "maintenance-\(title)-\(message)"
        case .forceUpdate(let version):
            return "force-\(version.id)"
        }
    }
}
