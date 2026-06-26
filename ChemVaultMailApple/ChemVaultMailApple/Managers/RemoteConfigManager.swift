import Combine
import Foundation

@MainActor
final class RemoteConfigManager: ObservableObject {
    @Published private(set) var config: RemoteConfig
    @Published private(set) var isRefreshingResources = false
    @Published private(set) var lastErrorMessage: String?
    @Published var launchBlock: LaunchBlock?
    @Published var optionalUpdate: AppVersion?

    private let cacheManager: ResourceCacheManager
    private let configService: RemoteConfigService
    private let resourceUpdateService: ResourceUpdateService
    private let defaults: UserDefaults

    init(
        cacheManager: ResourceCacheManager,
        configService: RemoteConfigService = RemoteConfigService(),
        resourceUpdateService: ResourceUpdateService? = nil,
        defaults: UserDefaults = .standard
    ) {
        self.cacheManager = cacheManager
        self.configService = configService
        self.resourceUpdateService = resourceUpdateService ?? ResourceUpdateService(cacheManager: cacheManager)
        self.defaults = defaults
        self.config = cacheManager.loadCachedConfig() ?? .bundledDefault
    }

    var currentAnnouncement: Announcement? {
        let announcement = config.announcement
        guard announcement.enabled,
              !announcement.title.isEmpty || !announcement.message.isEmpty,
              defaults.string(forKey: Keys.dismissedAnnouncementVersion) != config.configVersion else {
            return nil
        }
        return announcement
    }

    func bootstrap(apiClient: APIClient) async -> RemoteConfig {
        let currentVersion = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0.0"
        let buildNumber = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "1"
        let locale = Locale.current.identifier
        let region = Locale.current.region?.identifier ?? ""

        do {
            let remoteConfig = try await configService.fetchConfig(
                apiClient: apiClient,
                currentVersion: currentVersion,
                buildNumber: buildNumber,
                locale: locale,
                region: region
            )
            apply(remoteConfig, currentVersion: currentVersion)
            cacheManager.saveConfig(remoteConfig)
            await refreshResourcesIfPossible(using: remoteConfig)
        } catch {
            lastErrorMessage = error.localizedDescription
            apply(config, currentVersion: currentVersion)
        }

        return config
    }

    func retry(apiClient: APIClient) async {
        _ = await bootstrap(apiClient: apiClient)
    }

    func dismissAnnouncement() {
        defaults.set(config.configVersion, forKey: Keys.dismissedAnnouncementVersion)
        objectWillChange.send()
    }

    private func apply(_ config: RemoteConfig, currentVersion: String) {
        self.config = config

        if config.maintenanceMode {
            launchBlock = .maintenance(
                title: config.maintenanceTitle,
                message: config.maintenanceMessage,
                supportEmail: config.links.supportEmail,
                helpCenterUrl: config.links.helpCenterUrl
            )
            optionalUpdate = nil
            return
        }

        guard let versionCheck = VersionCheckService.evaluate(currentVersion: currentVersion, config: config) else {
            launchBlock = nil
            optionalUpdate = nil
            return
        }

        switch versionCheck.kind {
        case .forced:
            launchBlock = .forceUpdate(versionCheck)
            optionalUpdate = nil
        case .optional:
            launchBlock = nil
            optionalUpdate = versionCheck
        }
    }

    private func refreshResourcesIfPossible(using config: RemoteConfig) async {
        isRefreshingResources = true
        defer { isRefreshingResources = false }

        do {
            _ = try await resourceUpdateService.updateResourcesIfNeeded(manifestURL: config.resourceManifestUrl)
        } catch {
            lastErrorMessage = error.localizedDescription
        }
    }

    private enum Keys {
        static let dismissedAnnouncementVersion = "chemvault.remoteConfig.dismissedAnnouncementVersion"
    }
}
