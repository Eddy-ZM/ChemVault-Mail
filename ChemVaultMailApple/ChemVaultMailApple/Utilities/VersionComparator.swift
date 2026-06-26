import Foundation

enum VersionComparator {
    static func compare(_ lhs: String, _ rhs: String) -> ComparisonResult {
        let left = versionParts(lhs)
        let right = versionParts(rhs)
        let count = max(left.count, right.count)

        for index in 0..<count {
            let a = index < left.count ? left[index] : 0
            let b = index < right.count ? right[index] : 0
            if a < b { return .orderedAscending }
            if a > b { return .orderedDescending }
        }

        return .orderedSame
    }

    static func isVersion(_ lhs: String, lessThan rhs: String) -> Bool {
        compare(lhs, rhs) == .orderedAscending
    }

    private static func versionParts(_ value: String) -> [Int] {
        value
            .split { !$0.isNumber }
            .map { Int($0) ?? 0 }
    }
}
