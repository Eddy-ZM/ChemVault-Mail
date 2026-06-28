import Foundation

struct RemoteConfig: Codable, Equatable {
    var platform: String
    var minimumSupportedVersion: String
    var latestVersion: String
    var forceUpdate: Bool
    var appStoreUrl: String
    var apiBaseUrl: String
    var maintenanceMode: Bool
    var maintenanceTitle: String
    var maintenanceMessage: String
    var announcement: Announcement
    var featureFlags: FeatureFlags
    var theme: RemoteTheme
    var links: AppLinks
    var templates: TemplateVersions
    var resourceManifestUrl: String
    var configVersion: String

    static let bundledDefault = RemoteConfig()

    init(
        platform: String = "ios",
        minimumSupportedVersion: String = "0.2",
        latestVersion: String = "0.2",
        forceUpdate: Bool = false,
        appStoreUrl: String = "https://apps.apple.com/app/idXXXXXXXXXX",
        apiBaseUrl: String = "https://mail.chemvault.science/api",
        maintenanceMode: Bool = false,
        maintenanceTitle: String = "Maintenance",
        maintenanceMessage: String = "ChemVault Mail is temporarily under maintenance. Please try again later.",
        announcement: Announcement = .defaults,
        featureFlags: FeatureFlags = .defaults,
        theme: RemoteTheme = .defaults,
        links: AppLinks = .defaults,
        templates: TemplateVersions = .defaults,
        resourceManifestUrl: String = "https://assets.chemvault.science/mail/manifest.json",
        configVersion: String = "bundled"
    ) {
        self.platform = platform
        self.minimumSupportedVersion = minimumSupportedVersion
        self.latestVersion = latestVersion
        self.forceUpdate = forceUpdate
        self.appStoreUrl = appStoreUrl
        self.apiBaseUrl = apiBaseUrl
        self.maintenanceMode = maintenanceMode
        self.maintenanceTitle = maintenanceTitle
        self.maintenanceMessage = maintenanceMessage
        self.announcement = announcement
        self.featureFlags = featureFlags
        self.theme = theme
        self.links = links
        self.templates = templates
        self.resourceManifestUrl = resourceManifestUrl
        self.configVersion = configVersion
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        platform = try container.decodeIfPresent(String.self, forKey: .platform) ?? Self.bundledDefault.platform
        minimumSupportedVersion = try container.decodeIfPresent(String.self, forKey: .minimumSupportedVersion) ?? Self.bundledDefault.minimumSupportedVersion
        latestVersion = try container.decodeIfPresent(String.self, forKey: .latestVersion) ?? Self.bundledDefault.latestVersion
        forceUpdate = try container.decodeIfPresent(Bool.self, forKey: .forceUpdate) ?? Self.bundledDefault.forceUpdate
        appStoreUrl = try container.decodeIfPresent(String.self, forKey: .appStoreUrl) ?? Self.bundledDefault.appStoreUrl
        apiBaseUrl = try container.decodeIfPresent(String.self, forKey: .apiBaseUrl) ?? Self.bundledDefault.apiBaseUrl
        maintenanceMode = try container.decodeIfPresent(Bool.self, forKey: .maintenanceMode) ?? Self.bundledDefault.maintenanceMode
        maintenanceTitle = try container.decodeIfPresent(String.self, forKey: .maintenanceTitle) ?? Self.bundledDefault.maintenanceTitle
        maintenanceMessage = try container.decodeIfPresent(String.self, forKey: .maintenanceMessage) ?? Self.bundledDefault.maintenanceMessage
        announcement = try container.decodeIfPresent(Announcement.self, forKey: .announcement) ?? Self.bundledDefault.announcement
        featureFlags = try container.decodeIfPresent(FeatureFlags.self, forKey: .featureFlags) ?? Self.bundledDefault.featureFlags
        theme = try container.decodeIfPresent(RemoteTheme.self, forKey: .theme) ?? Self.bundledDefault.theme
        links = try container.decodeIfPresent(AppLinks.self, forKey: .links) ?? Self.bundledDefault.links
        templates = try container.decodeIfPresent(TemplateVersions.self, forKey: .templates) ?? Self.bundledDefault.templates
        resourceManifestUrl = try container.decodeIfPresent(String.self, forKey: .resourceManifestUrl) ?? Self.bundledDefault.resourceManifestUrl
        configVersion = try container.decodeIfPresent(String.self, forKey: .configVersion) ?? Self.bundledDefault.configVersion
    }
}

struct RemoteTheme: Codable, Equatable {
    var primaryColor: String
    var logoUrl: String
    var bannerUrl: String

    static let defaults = RemoteTheme(
        primaryColor: "#FACC15",
        logoUrl: "https://assets.chemvault.science/mail/logo.png",
        bannerUrl: "https://assets.chemvault.science/mail/banner.png"
    )

    init(primaryColor: String = "#FACC15", logoUrl: String = "https://assets.chemvault.science/mail/logo.png", bannerUrl: String = "https://assets.chemvault.science/mail/banner.png") {
        self.primaryColor = primaryColor
        self.logoUrl = logoUrl
        self.bannerUrl = bannerUrl
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        primaryColor = try container.decodeIfPresent(String.self, forKey: .primaryColor) ?? Self.defaults.primaryColor
        logoUrl = try container.decodeIfPresent(String.self, forKey: .logoUrl) ?? Self.defaults.logoUrl
        bannerUrl = try container.decodeIfPresent(String.self, forKey: .bannerUrl) ?? Self.defaults.bannerUrl
    }
}

struct AppLinks: Codable, Equatable {
    var privacyPolicyUrl: String
    var termsUrl: String
    var helpCenterUrl: String
    var supportEmail: String

    static let defaults = AppLinks(
        privacyPolicyUrl: "https://chemvault.science/privacy",
        termsUrl: "https://chemvault.science/terms",
        helpCenterUrl: "https://chemvault.science/help",
        supportEmail: "support@chemvault.science"
    )

    init(privacyPolicyUrl: String = "https://chemvault.science/privacy", termsUrl: String = "https://chemvault.science/terms", helpCenterUrl: String = "https://chemvault.science/help", supportEmail: String = "support@chemvault.science") {
        self.privacyPolicyUrl = privacyPolicyUrl
        self.termsUrl = termsUrl
        self.helpCenterUrl = helpCenterUrl
        self.supportEmail = supportEmail.normalizedSupportEmail
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        privacyPolicyUrl = try container.decodeIfPresent(String.self, forKey: .privacyPolicyUrl) ?? Self.defaults.privacyPolicyUrl
        termsUrl = try container.decodeIfPresent(String.self, forKey: .termsUrl) ?? Self.defaults.termsUrl
        helpCenterUrl = try container.decodeIfPresent(String.self, forKey: .helpCenterUrl) ?? Self.defaults.helpCenterUrl
        supportEmail = (try container.decodeIfPresent(String.self, forKey: .supportEmail) ?? Self.defaults.supportEmail).normalizedSupportEmail
    }
}

struct TemplateVersions: Codable, Equatable {
    var welcomeEmailTemplateVersion: String
    var notificationTemplateVersion: String

    static let defaults = TemplateVersions(
        welcomeEmailTemplateVersion: "bundled",
        notificationTemplateVersion: "bundled"
    )

    init(welcomeEmailTemplateVersion: String = "bundled", notificationTemplateVersion: String = "bundled") {
        self.welcomeEmailTemplateVersion = welcomeEmailTemplateVersion
        self.notificationTemplateVersion = notificationTemplateVersion
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        welcomeEmailTemplateVersion = try container.decodeIfPresent(String.self, forKey: .welcomeEmailTemplateVersion) ?? Self.defaults.welcomeEmailTemplateVersion
        notificationTemplateVersion = try container.decodeIfPresent(String.self, forKey: .notificationTemplateVersion) ?? Self.defaults.notificationTemplateVersion
    }
}

private extension String {
    var normalizedSupportEmail: String {
        let normalized = trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "mailto:", with: "", options: .caseInsensitive)
        return normalized.contains("@") ? normalized : AppLinks.defaults.supportEmail
    }
}
