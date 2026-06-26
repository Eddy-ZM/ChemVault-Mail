import Foundation

struct FeatureFlags: Codable, Equatable {
    var enableNewInboxUI: Bool
    var enableSystemNotifications: Bool
    var enableBetaMailComposer: Bool
    var enableCloudflareLogin: Bool
    var enableDebugPanel: Bool

    static let defaults = FeatureFlags(
        enableNewInboxUI: false,
        enableSystemNotifications: true,
        enableBetaMailComposer: false,
        enableCloudflareLogin: true,
        enableDebugPanel: false
    )

    init(
        enableNewInboxUI: Bool = false,
        enableSystemNotifications: Bool = true,
        enableBetaMailComposer: Bool = false,
        enableCloudflareLogin: Bool = true,
        enableDebugPanel: Bool = false
    ) {
        self.enableNewInboxUI = enableNewInboxUI
        self.enableSystemNotifications = enableSystemNotifications
        self.enableBetaMailComposer = enableBetaMailComposer
        self.enableCloudflareLogin = enableCloudflareLogin
        self.enableDebugPanel = enableDebugPanel
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        enableNewInboxUI = try container.decodeIfPresent(Bool.self, forKey: .enableNewInboxUI) ?? Self.defaults.enableNewInboxUI
        enableSystemNotifications = try container.decodeIfPresent(Bool.self, forKey: .enableSystemNotifications) ?? Self.defaults.enableSystemNotifications
        enableBetaMailComposer = try container.decodeIfPresent(Bool.self, forKey: .enableBetaMailComposer) ?? Self.defaults.enableBetaMailComposer
        enableCloudflareLogin = try container.decodeIfPresent(Bool.self, forKey: .enableCloudflareLogin) ?? Self.defaults.enableCloudflareLogin
        enableDebugPanel = try container.decodeIfPresent(Bool.self, forKey: .enableDebugPanel) ?? Self.defaults.enableDebugPanel
    }
}
