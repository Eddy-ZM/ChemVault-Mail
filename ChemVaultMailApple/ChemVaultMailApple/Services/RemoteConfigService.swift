import Foundation

@MainActor
final class RemoteConfigService {
    func fetchConfig(
        apiClient: APIClient,
        currentVersion: String,
        buildNumber: String,
        locale: String,
        region: String
    ) async throws -> RemoteConfig {
        let config: RemoteConfig = try await apiClient.get(
            "/app/config",
            query: [
                URLQueryItem(name: "platform", value: "ios"),
                URLQueryItem(name: "version", value: currentVersion),
                URLQueryItem(name: "build", value: buildNumber),
                URLQueryItem(name: "locale", value: locale),
                URLQueryItem(name: "region", value: region)
            ]
        )
        try JSONSchemaValidator.validate(config: config)
        return config
    }

    func fetchTemplates(apiClient: APIClient, locale: String) async throws -> RemoteTemplateSet {
        let templates: RemoteTemplateSet = try await apiClient.get(
            "/app/templates",
            query: [
                URLQueryItem(name: "platform", value: "ios"),
                URLQueryItem(name: "locale", value: locale)
            ]
        )
        return templates.sanitized()
    }
}

struct RemoteTemplateSet: Codable, Equatable {
    var version: String
    var templates: [String: [String: String]]

    static let bundledDefault = RemoteTemplateSet(
        version: "bundled",
        templates: [
            "welcome": [
                "subject": "Welcome to ChemVault Mail",
                "body": "Your ChemVault Mail account is ready."
            ],
            "systemNotification": [
                "title": "ChemVault Notification",
                "body": "You have a new system message."
            ]
        ]
    )

    init(version: String = "bundled", templates: [String: [String: String]] = [:]) {
        self.version = version
        self.templates = templates.isEmpty ? Self.bundledDefault.templates : templates
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        version = try container.decodeIfPresent(String.self, forKey: .version) ?? Self.bundledDefault.version
        templates = try container.decodeIfPresent([String: [String: String]].self, forKey: .templates) ?? Self.bundledDefault.templates
    }

    func sanitized() -> RemoteTemplateSet {
        RemoteTemplateSet(
            version: version,
            templates: templates.mapValues { fields in
                fields.mapValues(JSONSchemaValidator.sanitizeTemplateHTML)
            }
        )
    }
}
