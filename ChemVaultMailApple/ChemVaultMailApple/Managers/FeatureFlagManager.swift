import Combine
import Foundation

@MainActor
final class FeatureFlagManager: ObservableObject {
    @Published private(set) var flags: FeatureFlags

    init(flags: FeatureFlags = .defaults) {
        self.flags = Self.productionSafeFlags(from: flags)
    }

    func update(_ flags: FeatureFlags) {
        self.flags = Self.productionSafeFlags(from: flags)
    }

    func isEnabled(_ keyPath: KeyPath<FeatureFlags, Bool>) -> Bool {
        flags[keyPath: keyPath]
    }

    private static func productionSafeFlags(from flags: FeatureFlags) -> FeatureFlags {
        var safeFlags = flags
        #if DEBUG
        return safeFlags
        #else
        let isTestFlight = Bundle.main.appStoreReceiptURL?.lastPathComponent == "sandboxReceipt"
        if !isTestFlight {
            safeFlags.enableDebugPanel = false
        }
        return safeFlags
        #endif
    }
}
