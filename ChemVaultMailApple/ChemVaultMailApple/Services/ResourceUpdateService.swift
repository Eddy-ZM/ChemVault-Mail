import Foundation

@MainActor
final class ResourceUpdateService {
    private let cacheManager: ResourceCacheManager
    private let assetDownloader: AssetDownloadService
    private let session: URLSession
    private let decoder = JSONDecoder.chemVault

    init(
        cacheManager: ResourceCacheManager,
        assetDownloader: AssetDownloadService = AssetDownloadService(),
        session: URLSession = .shared
    ) {
        self.cacheManager = cacheManager
        self.assetDownloader = assetDownloader
        self.session = session
    }

    func updateResourcesIfNeeded(manifestURL: String) async throws -> RemoteAssetManifest {
        guard cacheManager.shouldRefreshResources || cacheManager.cachedManifestVersion == nil else {
            return cacheManager.loadCachedManifest() ?? .bundledDefault
        }

        let manifest = try await fetchManifest(from: manifestURL)
        if manifest.version == cacheManager.cachedManifestVersion {
            cacheManager.saveManifest(manifest)
            return manifest
        }

        for asset in manifest.assets {
            do {
                let temporaryURL = try await assetDownloader.downloadAndValidate(asset: asset)
                _ = try cacheManager.saveAsset(from: temporaryURL, asset: asset)
            } catch {
                if asset.required && cacheManager.cachedAssetURL(for: asset) == nil {
                    throw error
                }
            }
        }

        cacheManager.saveManifest(manifest)
        cacheManager.cleanExpiredAssets(keeping: manifest)
        return manifest
    }

    private func fetchManifest(from value: String) async throws -> RemoteAssetManifest {
        guard let url = URLValidator.parsedHTTPSURL(value),
              URLValidator.isAllowedAssetURL(value) else {
            throw RemoteConfigValidationError.invalidAssetURL("resourceManifestUrl")
        }

        let (data, response) = try await session.data(from: url)
        guard let statusCode = (response as? HTTPURLResponse)?.statusCode,
              (200..<300).contains(statusCode) else {
            throw URLError(.badServerResponse)
        }

        let manifest: RemoteAssetManifest
        if let directManifest = try? decoder.decode(RemoteAssetManifest.self, from: data) {
            manifest = directManifest
        } else {
            manifest = try decoder.decode(APIEnvelope<RemoteAssetManifest>.self, from: data).data ?? .bundledDefault
        }

        try JSONSchemaValidator.validate(manifest: manifest)
        return manifest
    }
}
