import CryptoKit
import Foundation

@MainActor
final class AssetDownloadService {
    private let session: URLSession

    init(session: URLSession = .shared) {
        self.session = session
    }

    func downloadAndValidate(asset: RemoteAsset) async throws -> URL {
        try JSONSchemaValidator.validate(manifest: RemoteAssetManifest(version: "single", assets: [asset]))
        guard let url = URLValidator.parsedHTTPSURL(asset.url) else {
            throw RemoteConfigValidationError.invalidAssetURL(asset.key)
        }

        let (temporaryURL, response) = try await session.download(from: url)
        guard let statusCode = (response as? HTTPURLResponse)?.statusCode,
              (200..<300).contains(statusCode) else {
            throw URLError(.badServerResponse)
        }

        let data = try Data(contentsOf: temporaryURL)
        let digest = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        guard digest.lowercased() == asset.sha256.lowercased() else {
            throw RemoteConfigValidationError.invalidSHA256(asset.key)
        }

        return temporaryURL
    }
}
