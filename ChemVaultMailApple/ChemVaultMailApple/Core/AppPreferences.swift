import Combine
import Foundation

@MainActor
final class AppPreferences: ObservableObject {
    static let defaultBaseURL = "https://mail.chemvault.science/api"

    @Published var baseURLString: String {
        didSet { defaults.set(baseURLString, forKey: Keys.baseURLString) }
    }

    @Published var language: String {
        didSet { defaults.set(language, forKey: Keys.language) }
    }

    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        let storedBaseURL = defaults.string(forKey: Keys.baseURLString)
        let resolvedBaseURL = Self.resolveStoredBaseURL(
            storedBaseURL,
            isManaged: defaults.bool(forKey: Keys.baseURLIsManaged)
        )
        self.baseURLString = resolvedBaseURL
        if storedBaseURL != resolvedBaseURL {
            defaults.set(resolvedBaseURL, forKey: Keys.baseURLString)
        }
        self.language = defaults.string(forKey: Keys.language) ?? Locale.preferredLanguages.first?.components(separatedBy: "-").first ?? "en"
    }

    var baseURL: URL? {
        URL(string: baseURLString.trimmingCharacters(in: .whitespacesAndNewlines))
    }

    func applyGlobalBaseURLIfPresent(_ value: String?) {
        guard let normalized = Self.normalizedBaseURL(value) else { return }
        defaults.set(true, forKey: Keys.baseURLIsManaged)
        if normalized != baseURLString {
            baseURLString = normalized
        }
    }

    func setAdminManagedBaseURL(_ value: String) {
        guard let normalized = Self.normalizedBaseURL(value) else { return }
        defaults.set(true, forKey: Keys.baseURLIsManaged)
        baseURLString = normalized
    }

    static func normalizedBaseURL(_ value: String?) -> String? {
        guard let value else { return nil }
        let normalized = value.trimmingCharacters(in: .whitespacesAndNewlines).trimmingTrailingSlashes()
        guard !normalized.isEmpty else { return nil }
        if normalized == "https://mail.chemvault.science" {
            return defaultBaseURL
        }
        guard let components = URLComponents(string: normalized),
              let scheme = components.scheme?.lowercased(),
              ["http", "https"].contains(scheme),
              components.host?.isEmpty == false else {
            return nil
        }
        return normalized
    }

    private static func resolveStoredBaseURL(_ value: String?, isManaged: Bool) -> String {
        guard let normalized = normalizedBaseURL(value) else { return defaultBaseURL }
        guard isManaged || normalized == defaultBaseURL else { return defaultBaseURL }
        return normalized
    }

    private enum Keys {
        static let baseURLString = "chemvault.baseURLString"
        static let baseURLIsManaged = "chemvault.baseURLIsManaged"
        static let language = "chemvault.language"
    }
}

private extension String {
    func trimmingTrailingSlashes() -> String {
        var value = self
        while value.hasSuffix("/") {
            value.removeLast()
        }
        return value
    }
}
