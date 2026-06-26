import Foundation

enum RemoteConfigValidationError: LocalizedError, Equatable {
    case invalidURL(String)
    case invalidAppStoreURL
    case invalidAssetURL(String)
    case invalidResourceType(String)
    case invalidSHA256(String)
    case blankAssetKey

    var errorDescription: String? {
        switch self {
        case .invalidURL(let field):
            return "\(field) must be a valid https URL."
        case .invalidAppStoreURL:
            return "App Store URL must use https://apps.apple.com."
        case .invalidAssetURL(let field):
            return "\(field) must use an allowed asset domain and non-executable file type."
        case .invalidResourceType(let type):
            return "Remote asset type \(type) is not allowed."
        case .invalidSHA256(let key):
            return "Remote asset \(key) must include a 64-character sha256 hash."
        case .blankAssetKey:
            return "Remote asset key is required."
        }
    }
}

enum JSONSchemaValidator {
    static func validate(config: RemoteConfig) throws {
        guard URLValidator.isAppStoreURL(config.appStoreUrl) else {
            throw RemoteConfigValidationError.invalidAppStoreURL
        }
        try requireHTTPS(config.apiBaseUrl, field: "apiBaseUrl")
        try requireHTTPS(config.links.privacyPolicyUrl, field: "links.privacyPolicyUrl")
        try requireHTTPS(config.links.termsUrl, field: "links.termsUrl")
        try requireHTTPS(config.links.helpCenterUrl, field: "links.helpCenterUrl")
        try requireAssetURL(config.theme.logoUrl, field: "theme.logoUrl")
        try requireAssetURL(config.theme.bannerUrl, field: "theme.bannerUrl")
        try requireAssetURL(config.resourceManifestUrl, field: "resourceManifestUrl")

        if let link = config.announcement.link, !link.isEmpty {
            try requireHTTPS(link, field: "announcement.link")
        }
    }

    static func validate(manifest: RemoteAssetManifest) throws {
        for asset in manifest.assets {
            guard !asset.key.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                throw RemoteConfigValidationError.blankAssetKey
            }
            guard URLValidator.isAllowedAssetURL(asset.url) else {
                throw RemoteConfigValidationError.invalidAssetURL(asset.key)
            }
            guard asset.sha256.range(of: "^[A-Fa-f0-9]{64}$", options: .regularExpression) != nil else {
                throw RemoteConfigValidationError.invalidSHA256(asset.key)
            }
        }
    }

    static func sanitizeTemplateHTML(_ html: String) -> String {
        html
            .replacingOccurrences(of: #"<script\b[^>]*>[\s\S]*?</script>"#, with: "", options: [.regularExpression, .caseInsensitive])
            .replacingOccurrences(of: #"(?i)\son[a-z]+\s*=\s*(['"]).*?\1"#, with: "", options: .regularExpression)
            .replacingOccurrences(of: #"(?i)javascript:"#, with: "", options: .regularExpression)
    }

    private static func requireHTTPS(_ value: String, field: String) throws {
        guard URLValidator.isHTTPSURL(value) else {
            throw RemoteConfigValidationError.invalidURL(field)
        }
    }

    private static func requireAssetURL(_ value: String, field: String) throws {
        guard URLValidator.isAllowedAssetURL(value) else {
            throw RemoteConfigValidationError.invalidAssetURL(field)
        }
    }
}
