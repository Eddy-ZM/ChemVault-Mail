import Foundation

enum VersionCheckService {
    static func evaluate(currentVersion: String, config: RemoteConfig) -> AppVersion? {
        if VersionComparator.isVersion(currentVersion, lessThan: config.minimumSupportedVersion)
            || (config.forceUpdate && VersionComparator.isVersion(currentVersion, lessThan: config.latestVersion)) {
            return AppVersion(
                currentVersion: currentVersion,
                latestVersion: config.latestVersion,
                minimumSupportedVersion: config.minimumSupportedVersion,
                appStoreUrl: config.appStoreUrl,
                kind: .forced
            )
        }

        if VersionComparator.isVersion(currentVersion, lessThan: config.latestVersion) {
            return AppVersion(
                currentVersion: currentVersion,
                latestVersion: config.latestVersion,
                minimumSupportedVersion: config.minimumSupportedVersion,
                appStoreUrl: config.appStoreUrl,
                kind: .optional
            )
        }

        return nil
    }
}
