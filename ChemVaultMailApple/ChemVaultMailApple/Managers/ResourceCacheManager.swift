import Foundation

@MainActor
final class ResourceCacheManager {
    private let fileManager: FileManager
    private let defaults: UserDefaults
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder.chemVault
    private let baseDirectory: URL

    init(fileManager: FileManager = .default, defaults: UserDefaults = .standard) {
        self.fileManager = fileManager
        self.defaults = defaults
        let applicationSupport = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
        self.baseDirectory = (applicationSupport ?? fileManager.temporaryDirectory)
            .appendingPathComponent("ChemVaultMailApple", isDirectory: true)
            .appendingPathComponent("RemoteResources", isDirectory: true)
        try? fileManager.createDirectory(at: baseDirectory, withIntermediateDirectories: true)
    }

    var cachedManifestVersion: String? {
        defaults.string(forKey: Keys.manifestVersion)
    }

    var shouldRefreshResources: Bool {
        guard let lastRefresh = defaults.object(forKey: Keys.lastResourceRefresh) as? Date else { return true }
        return Date().timeIntervalSince(lastRefresh) > 24 * 60 * 60
    }

    func loadCachedConfig() -> RemoteConfig? {
        decode(RemoteConfig.self, from: configURL)
    }

    func saveConfig(_ config: RemoteConfig) {
        encode(config, to: configURL)
    }

    func loadCachedManifest() -> RemoteAssetManifest? {
        decode(RemoteAssetManifest.self, from: manifestURL)
    }

    func saveManifest(_ manifest: RemoteAssetManifest) {
        encode(manifest, to: manifestURL)
        defaults.set(manifest.version, forKey: Keys.manifestVersion)
        defaults.set(Date(), forKey: Keys.lastResourceRefresh)
    }

    func cachedAssetURL(for asset: RemoteAsset) -> URL? {
        let url = assetURL(for: asset)
        return fileManager.fileExists(atPath: url.path) ? url : nil
    }

    func saveAsset(from temporaryURL: URL, asset: RemoteAsset) throws -> URL {
        try fileManager.createDirectory(at: assetsDirectory, withIntermediateDirectories: true)
        let destination = assetURL(for: asset)
        if fileManager.fileExists(atPath: destination.path) {
            try fileManager.removeItem(at: destination)
        }
        try fileManager.copyItem(at: temporaryURL, to: destination)
        return destination
    }

    func bundledFallbackURL(named name: String, extension fileExtension: String? = nil) -> URL? {
        Bundle.main.url(forResource: name, withExtension: fileExtension)
    }

    func cleanExpiredAssets(keeping manifest: RemoteAssetManifest) {
        guard let files = try? fileManager.contentsOfDirectory(at: assetsDirectory, includingPropertiesForKeys: nil) else { return }
        let allowedNames = Set(manifest.assets.map(cacheFileName(for:)))
        for file in files where !allowedNames.contains(file.lastPathComponent) {
            try? fileManager.removeItem(at: file)
        }
    }

    private var configURL: URL {
        baseDirectory.appendingPathComponent("remote-config.json")
    }

    private var manifestURL: URL {
        baseDirectory.appendingPathComponent("manifest.json")
    }

    private var assetsDirectory: URL {
        baseDirectory.appendingPathComponent("Assets", isDirectory: true)
    }

    private func assetURL(for asset: RemoteAsset) -> URL {
        assetsDirectory.appendingPathComponent(cacheFileName(for: asset))
    }

    private func cacheFileName(for asset: RemoteAsset) -> String {
        let sourceExtension = URL(string: asset.url)?.pathExtension
        let suffix = sourceExtension?.isEmpty == false ? ".\(sourceExtension!)" : ""
        return "\(asset.key)-\(asset.sha256.prefix(12))\(suffix)"
    }

    private func encode<Value: Encodable>(_ value: Value, to url: URL) {
        guard let data = try? encoder.encode(value) else { return }
        try? fileManager.createDirectory(at: baseDirectory, withIntermediateDirectories: true)
        try? data.write(to: url, options: [.atomic])
    }

    private func decode<Value: Decodable>(_ type: Value.Type, from url: URL) -> Value? {
        guard let data = try? Data(contentsOf: url) else { return nil }
        return try? decoder.decode(Value.self, from: data)
    }

    private enum Keys {
        static let manifestVersion = "chemvault.remoteResources.manifestVersion"
        static let lastResourceRefresh = "chemvault.remoteResources.lastRefresh"
    }
}
