import Foundation

enum URLValidator {
    static let allowedAssetHosts: Set<String> = ["assets.chemvault.science"]
    static let blockedExtensions: [String] = [
        ".swift",
        ".m",
        ".h",
        ".framework",
        ".dylib",
        ".so",
        ".ipa",
        ".jsbundle",
        ".lua",
        ".py",
        ".wasm",
        ".exe"
    ]

    static func isHTTPSURL(_ value: String?) -> Bool {
        guard let url = parsedHTTPSURL(value) else { return false }
        return url.host?.isEmpty == false
    }

    static func isAppStoreURL(_ value: String?) -> Bool {
        parsedHTTPSURL(value)?.host?.lowercased() == "apps.apple.com"
    }

    static func isAllowedAssetURL(_ value: String?) -> Bool {
        guard let url = parsedHTTPSURL(value),
              let host = url.host?.lowercased(),
              allowedAssetHosts.contains(host) else {
            return false
        }

        let path = url.path.lowercased()
        return !blockedExtensions.contains { path.hasSuffix($0) || path.contains("\($0)/") }
    }

    static func isAllowedWebContentURL(_ value: String?) -> Bool {
        isHTTPSURL(value)
    }

    static func parsedHTTPSURL(_ value: String?) -> URL? {
        guard let value = value?.trimmingCharacters(in: .whitespacesAndNewlines),
              let url = URL(string: value),
              url.scheme?.lowercased() == "https",
              url.host?.isEmpty == false else {
            return nil
        }
        return url
    }
}
