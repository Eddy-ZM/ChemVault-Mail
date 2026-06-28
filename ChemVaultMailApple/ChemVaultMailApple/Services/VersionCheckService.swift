import Foundation

enum AppDistributionChannel: Equatable {
    case appStore
    case testFlight
    case development

    static var current: AppDistributionChannel {
        #if DEBUG
        return .development
        #else
        guard let receiptURL = Bundle.main.appStoreReceiptURL else {
            return .development
        }

        return receiptURL.lastPathComponent == "sandboxReceipt" ? .testFlight : .appStore
        #endif
    }

    var usesAppStoreVersionChecks: Bool {
        self == .appStore
    }
}

enum VersionCheckService {
    static func evaluate(
        currentVersion: String,
        config: RemoteConfig,
        distributionChannel: AppDistributionChannel = .current
    ) -> AppVersion? {
        guard distributionChannel.usesAppStoreVersionChecks else {
            return nil
        }

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
