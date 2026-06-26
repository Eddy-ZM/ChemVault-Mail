import Foundation

struct Announcement: Codable, Equatable {
    var enabled: Bool
    var title: String
    var message: String
    var link: String?

    static let defaults = Announcement(enabled: false, title: "", message: "", link: nil)

    init(enabled: Bool = false, title: String = "", message: String = "", link: String? = nil) {
        self.enabled = enabled
        self.title = title
        self.message = message
        self.link = link?.nilIfBlank
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        enabled = try container.decodeIfPresent(Bool.self, forKey: .enabled) ?? false
        title = try container.decodeIfPresent(String.self, forKey: .title) ?? ""
        message = try container.decodeIfPresent(String.self, forKey: .message) ?? ""
        link = try container.decodeIfPresent(String.self, forKey: .link)?.nilIfBlank
    }
}
