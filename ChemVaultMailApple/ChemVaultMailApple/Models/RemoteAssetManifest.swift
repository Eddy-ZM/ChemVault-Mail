import Foundation

enum RemoteAssetType: String, Codable, Equatable {
    case image
    case json
    case text
    case html
}

struct RemoteAsset: Codable, Identifiable, Equatable {
    var key: String
    var type: RemoteAssetType
    var url: String
    var sha256: String
    var required: Bool

    var id: String { key }

    init(key: String, type: RemoteAssetType, url: String, sha256: String, required: Bool = false) {
        self.key = key
        self.type = type
        self.url = url
        self.sha256 = sha256
        self.required = required
    }
}

struct RemoteAssetManifest: Codable, Equatable {
    var version: String
    var assets: [RemoteAsset]

    static let bundledDefault = RemoteAssetManifest(version: "bundled", assets: [])

    init(version: String = "bundled", assets: [RemoteAsset] = []) {
        self.version = version
        self.assets = assets
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        version = try container.decodeIfPresent(String.self, forKey: .version) ?? "bundled"
        assets = try container.decodeIfPresent([RemoteAsset].self, forKey: .assets) ?? []
    }
}
