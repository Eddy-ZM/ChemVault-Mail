import Combine
import Foundation

@MainActor
final class AppEnvironment: ObservableObject {
    let preferences: AppPreferences
    let apiClient: APIClient
    let authSession: AuthSession
    let resourceCacheManager: ResourceCacheManager
    let remoteConfigManager: RemoteConfigManager
    let featureFlagManager: FeatureFlagManager
    @Published private(set) var publicSettings: ChemVaultSetting?

    var isRegistrationEnabled: Bool {
        publicSettings?.isRegistrationEnabled == true
    }

    init(
        preferences: AppPreferences = AppPreferences(),
        tokenStore: TokenStoring = KeychainTokenStore()
    ) {
        self.preferences = preferences
        self.resourceCacheManager = ResourceCacheManager()
        self.remoteConfigManager = RemoteConfigManager(cacheManager: resourceCacheManager)
        self.featureFlagManager = FeatureFlagManager(flags: remoteConfigManager.config.featureFlags)
        self.apiClient = APIClient(preferences: preferences)
        self.authSession = AuthSession(apiClient: apiClient, tokenStore: tokenStore)
    }

    func applyPublicSettings(_ settings: ChemVaultSetting) {
        publicSettings = settings
        preferences.applyGlobalBaseURLIfPresent(settings.appleApiBaseURL)
    }

    func bootstrapAppConfiguration() async {
        let config = await remoteConfigManager.bootstrap(apiClient: apiClient)
        applyRemoteConfig(config)
    }

    func applyRemoteConfig(_ config: RemoteConfig) {
        preferences.applyGlobalBaseURLIfPresent(config.apiBaseUrl)
        featureFlagManager.update(config.featureFlags)
    }
}
