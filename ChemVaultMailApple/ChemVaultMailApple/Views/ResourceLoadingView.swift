import SwiftUI

struct ResourceLoadingView: View {
    var body: some View {
        HStack(spacing: 10) {
            ProgressView()
                .controlSize(.small)
            Text("Updating resources")
                .font(.caption.weight(.medium))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 9)
        .background(.regularMaterial, in: Capsule())
        .shadow(radius: 12, x: 0, y: 8)
        .padding(.bottom, 16)
        .accessibilityLabel("Updating remote resources")
    }
}
