import SwiftUI
#if os(macOS)
import AppKit
#elseif canImport(UIKit)
import UIKit
#endif

struct ContentView: View {
    @EnvironmentObject private var authSession: AuthSession
    @EnvironmentObject private var appEnvironment: AppEnvironment
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var launchLoadingComplete = false
    @State private var bootstrapStarted = false
    @State private var isShowingAuthSuccessTransition = false

    var body: some View {
        ZStack {
            Group {
                if !launchLoadingComplete {
                    startupLoading
                } else {
                    switch authSession.state {
                    case .checking, .signedOut:
                        LoginView()
                            .transition(ChemVaultRootTransition.login)
                    case .signedIn:
                        AppShellView()
                            .transition(ChemVaultRootTransition.app)
                    }
                }
            }
            .scaleEffect(isShowingAuthSuccessTransition ? ChemVaultInteractionConfiguration.authContentScale : 1)
            .blur(radius: isShowingAuthSuccessTransition ? ChemVaultInteractionConfiguration.authBackdropBlurRadius : 0)
            .opacity(isShowingAuthSuccessTransition ? 0.58 : 1)
            .animation(reduceMotion ? nil : ChemVaultMotion.routeTransition, value: authSession.state)
            .animation(reduceMotion ? nil : ChemVaultMotion.depthShift, value: isShowingAuthSuccessTransition)

            if isShowingAuthSuccessTransition {
                ChemVaultAuthSuccessTransitionView()
                    .transition(ChemVaultRootTransition.successOverlay)
                    .zIndex(2)
            }
        }
        .task {
            await bootstrapOnce()
        }
        .onChange(of: authSession.state) { oldState, newState in
            handleAuthStateChange(from: oldState, to: newState)
        }
    }

    private var startupLoading: some View {
        ChemVaultLoadingView(
            title: ChemVaultLoadingConfiguration.title,
            subtitle: "Loading secure mailbox",
            size: 72,
            presentation: .startup
        )
        .transition(.opacity)
    }

    @MainActor
    private func bootstrapOnce() async {
        guard !bootstrapStarted else { return }
        bootstrapStarted = true

        async let bootstrap: Void = authSession.bootstrap()
        try? await Task.sleep(nanoseconds: UInt64(ChemVaultLoadingConfiguration.minimumPresentationMilliseconds) * 1_000_000)
        await bootstrap
        await syncPublicConnectionSettings()

        withAnimation(ChemVaultMotion.routeTransition) {
            launchLoadingComplete = true
        }
    }

    private func handleAuthStateChange(from oldState: AuthState, to newState: AuthState) {
        guard launchLoadingComplete,
              oldState == .checking,
              newState == .signedIn,
              !isShowingAuthSuccessTransition else {
            return
        }

        showAuthenticationSuccessTransition()
        Task { await syncPublicConnectionSettings() }
    }

    private func showAuthenticationSuccessTransition() {
        if reduceMotion {
            isShowingAuthSuccessTransition = true
        } else {
            withAnimation(ChemVaultMotion.authSuccess) {
                isShowingAuthSuccessTransition = true
            }
        }

        Task { @MainActor in
            try? await Task.sleep(nanoseconds: UInt64(ChemVaultTransitionConfiguration.successPresentationMilliseconds) * 1_000_000)
            withAnimation(reduceMotion ? nil : ChemVaultMotion.routeTransition) {
                isShowingAuthSuccessTransition = false
            }
        }
    }

    @MainActor
    private func syncPublicConnectionSettings() async {
        guard let settings: ChemVaultSetting = try? await appEnvironment.apiClient.get("/setting/websiteConfig") else { return }
        appEnvironment.preferences.applyGlobalBaseURLIfPresent(settings.appleApiBaseURL)
    }
}

#Preview {
    let environment = AppEnvironment()
    ContentView()
        .environmentObject(environment)
        .environmentObject(environment.preferences)
        .environmentObject(environment.authSession)
}

enum ChemVaultLoadingConfiguration {
    static let primaryHex = "#1890FF"
    static let sweepDuration = 1.55
    static let breathDuration = 1.9
    static let minimumPresentationMilliseconds = 720
    static let title = "ChemVault Mail"
    static let primaryColor = Color(red: 24 / 255, green: 144 / 255, blue: 1)
    static let darkPrimaryColor = Color(red: 118 / 255, green: 198 / 255, blue: 1)

    static func primaryColor(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark ? darkPrimaryColor : primaryColor
    }
}

enum ChemVaultTransitionConfiguration {
    static let successPresentationMilliseconds = 1120
    static let successTitle = "Authenticated"
    static let successSubtitle = "Opening secure mailbox"
}

enum ChemVaultInteractionConfiguration {
    static let routeTransitionDuration = 0.46
    static let fieldFocusScale: CGFloat = 1.006
    static let surfacePressScale: CGFloat = 0.972
    static let selectedSurfaceScale: CGFloat = 1.006
    static let hoverLiftScale: CGFloat = 1.012
    static let hoverYOffset: CGFloat = -1.5
    static let authContentScale: CGFloat = 0.968
    static let authBackdropBlurRadius: CGFloat = 16
    static let staggerStep = 0.055
    static let pressedBrightness = -0.025
    static let focusedShadowRadius: CGFloat = 16
}

enum ChemVaultMotion {
    static let screenTransition = Animation.smooth(duration: 0.34)
    static let entrance = Animation.spring(response: 0.62, dampingFraction: 0.88)
    static let quickPress = Animation.spring(response: 0.22, dampingFraction: 0.78)
    static let fieldFocus = Animation.smooth(duration: 0.2)
    static let rootContent = Animation.spring(response: 0.54, dampingFraction: 0.9)
    static let routeTransition = Animation.spring(
        response: ChemVaultInteractionConfiguration.routeTransitionDuration,
        dampingFraction: 0.91,
        blendDuration: 0.08
    )
    static let depthShift = Animation.spring(response: 0.52, dampingFraction: 0.92, blendDuration: 0.06)
    static let hoverSettle = Animation.spring(response: 0.28, dampingFraction: 0.82, blendDuration: 0.04)
    static let surfaceEntrance = Animation.spring(response: 0.58, dampingFraction: 0.9, blendDuration: 0.08)
    static let surfacePress = Animation.interactiveSpring(response: 0.2, dampingFraction: 0.86, blendDuration: 0.04)
    static let authSuccess = Animation.spring(response: 0.74, dampingFraction: 0.9, blendDuration: 0.08)
}

enum ChemVaultRootTransition {
    static var login: AnyTransition {
        .asymmetric(
            insertion: .opacity.combined(with: .scale(scale: 1.018)).combined(with: .offset(y: 18)),
            removal: .opacity.combined(with: .scale(scale: 0.974)).combined(with: .offset(y: -10))
        )
    }

    static var app: AnyTransition {
        .asymmetric(
            insertion: .opacity.combined(with: .scale(scale: 1.012)).combined(with: .offset(y: 12)),
            removal: .opacity.combined(with: .scale(scale: 0.982)).combined(with: .offset(y: -8))
        )
    }

    static var successOverlay: AnyTransition {
        .opacity.combined(with: .scale(scale: 0.92)).combined(with: .offset(y: 8))
    }

    static var routeContent: AnyTransition {
        .asymmetric(
            insertion: .opacity.combined(with: .scale(scale: 1.008)).combined(with: .offset(y: 10)),
            removal: .opacity.combined(with: .scale(scale: 0.992)).combined(with: .offset(y: -8))
        )
    }
}

extension View {
    func chemVaultEntrance(isVisible: Bool, delay: Double = 0, animation: Animation? = ChemVaultMotion.surfaceEntrance) -> some View {
        opacity(isVisible ? 1 : 0)
            .offset(y: isVisible ? 0 : 14)
            .blur(radius: isVisible ? 0 : 6)
            .animation(animation?.delay(delay), value: isVisible)
    }

    func chemVaultSurfaceDepth(
        isRaised: Bool,
        scale: CGFloat = ChemVaultInteractionConfiguration.selectedSurfaceScale,
        yOffset: CGFloat = -1
    ) -> some View {
        self
            .scaleEffect(isRaised ? scale : 1)
            .offset(y: isRaised ? yOffset : 0)
            .animation(ChemVaultMotion.depthShift, value: isRaised)
    }

    func chemVaultMagneticHover(isActive: Bool, isEnabled: Bool = true) -> some View {
        self
            .scaleEffect(isEnabled && isActive ? ChemVaultInteractionConfiguration.hoverLiftScale : 1)
            .offset(y: isEnabled && isActive ? ChemVaultInteractionConfiguration.hoverYOffset : 0)
            .animation(isEnabled ? ChemVaultMotion.hoverSettle : nil, value: isActive)
    }
}

struct ChemVaultAuthSuccessTransitionView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.colorScheme) private var colorScheme
    @State private var isActive = false

    var body: some View {
        ZStack {
            ChemVaultBrandBackground()

            Rectangle()
                .fill(.ultraThinMaterial)
                .ignoresSafeArea()

            VStack(spacing: 20) {
                ZStack {
                    ChemVaultSuccessSignal(size: 176, isActive: isActive)

                    ChemVaultLogoBadge(size: 82, shadowRadius: 18)
                        .scaleEffect(isActive ? 1 : 0.86)
                        .shadow(color: ChemVaultLoadingConfiguration.primaryColor(for: colorScheme).opacity(isActive ? 0.22 : 0), radius: 22, x: 0, y: 14)
                }
                .frame(width: 190, height: 190)

                VStack(spacing: 7) {
                    Label(ChemVaultTransitionConfiguration.successTitle, systemImage: "checkmark.seal.fill")
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(ChemVaultTheme.brandText(for: colorScheme))
                        .symbolRenderingMode(.hierarchical)
                        .contentTransition(.opacity)

                    Text(ChemVaultTransitionConfiguration.successSubtitle)
                        .font(.subheadline)
                        .foregroundStyle(ChemVaultTheme.secondaryText(for: colorScheme))
                }
                .opacity(isActive ? 1 : 0)
                .offset(y: isActive ? 0 : 12)
                .blur(radius: isActive ? 0 : 5)
            }
            .padding(.horizontal, 30)
            .padding(.vertical, 28)
            .background(ChemVaultTheme.loginCardBackground(for: colorScheme), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .stroke(ChemVaultTheme.loginCardStroke(for: colorScheme), lineWidth: 1)
            }
            .overlay(alignment: .top) {
                Capsule()
                    .fill(ChemVaultLoadingConfiguration.primaryColor(for: colorScheme).opacity(colorScheme == .dark ? 0.58 : 0.45))
                    .frame(width: isActive ? 92 : 22, height: 3)
                    .padding(.top, 1)
                    .opacity(isActive ? 1 : 0)
            }
            .shadow(color: ChemVaultTheme.loginShadow(for: colorScheme), radius: isActive ? 42 : 16, x: 0, y: 24)
            .padding(.horizontal, 32)
            .scaleEffect(isActive ? 1 : 0.95)
            .blur(radius: isActive ? 0 : 8)
        }
        .onAppear {
            if reduceMotion {
                isActive = true
            } else {
                withAnimation(ChemVaultMotion.authSuccess) {
                    isActive = true
                }
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(ChemVaultTransitionConfiguration.successTitle). \(ChemVaultTransitionConfiguration.successSubtitle).")
    }
}

private struct ChemVaultSuccessSignal: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.colorScheme) private var colorScheme
    var size: CGFloat
    var isActive: Bool

    var body: some View {
        TimelineView(.animation) { timeline in
            pulseFrame(date: timeline.date)
        }
        .frame(width: size, height: size)
    }

    private func pulseFrame(date: Date) -> some View {
        let accent = ChemVaultLoadingConfiguration.primaryColor(for: colorScheme)
        let time = reduceMotion ? 0 : date.timeIntervalSinceReferenceDate
        let orbit = (time.truncatingRemainder(dividingBy: 4.2) / 4.2) * 360
        let breath = reduceMotion ? 1 : 1 + sin(time / 2.4 * 2 * .pi) * 0.024

        return ZStack {
            ForEach(0..<3, id: \.self) { index in
                Circle()
                    .stroke(accent.opacity(0.055 + Double(index) * 0.038), lineWidth: 1)
                    .scaleEffect(isActive ? 1 + CGFloat(index) * 0.14 : 0.5)
                    .opacity(isActive ? 0.92 - Double(index) * 0.22 : 0)
            }

            Circle()
                .trim(from: 0.03, to: 0.24)
                .stroke(accent.opacity(colorScheme == .dark ? 0.8 : 0.62), style: StrokeStyle(lineWidth: 2.2, lineCap: .round))
                .rotationEffect(.degrees(orbit))
                .scaleEffect(breath)

            Circle()
                .trim(from: 0.56, to: 0.74)
                .stroke(accent.opacity(0.26), style: StrokeStyle(lineWidth: 1.4, lineCap: .round))
                .rotationEffect(.degrees(-orbit * 0.58))

            RoundedRectangle(cornerRadius: 2, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [.clear, accent.opacity(0.34), .clear],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .frame(width: size * 0.72, height: 1)
                .rotationEffect(.degrees(orbit * 0.32))
                .opacity(isActive ? 1 : 0)
        }
    }
}

struct ChemVaultLoadingView: View {
    enum Presentation {
        case startup
        case card
        case inline
    }

    var title: String = ChemVaultLoadingConfiguration.title
    var subtitle: String?
    var size: CGFloat = 44
    var presentation: Presentation = .card

    var body: some View {
        switch presentation {
        case .startup:
            ZStack {
                ChemVaultBrandBackground()
                loadingContent
                    .padding(.horizontal, 28)
                    .padding(.vertical, 34)
            }
        case .card:
            loadingContent
                .padding(20)
                .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .stroke(ChemVaultLoadingConfiguration.primaryColor.opacity(0.14), lineWidth: 1)
                }
                .shadow(color: .black.opacity(0.08), radius: 18, x: 0, y: 8)
        case .inline:
            HStack(spacing: 10) {
                ChemVaultLoadingMark(size: size, showsTrack: false)
                Text(subtitle ?? title)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var loadingContent: some View {
        VStack(spacing: 16) {
            ChemVaultLoadingMark(size: size)
            VStack(spacing: 5) {
                Text(title)
                    .font(.title2.weight(.semibold))
                if let subtitle {
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(subtitle ?? title)
    }
}

struct ChemVaultLoadingButtonLabel: View {
    var title: String
    var size: CGFloat = 18

    var body: some View {
        HStack(spacing: 8) {
            ChemVaultLoadingMark(size: size, showsTrack: true)
            Text(title)
        }
    }
}

struct ChemVaultLoadingMark: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.colorScheme) private var colorScheme
    @State private var isVisible = false

    var size: CGFloat = 30
    var showsTrack = true

    var body: some View {
        TimelineView(.animation) { timeline in
            markFrame(date: timeline.date)
        }
        .frame(width: size, height: size)
        .onAppear {
            if reduceMotion {
                isVisible = true
            } else {
                withAnimation(ChemVaultMotion.entrance) {
                    isVisible = true
                }
            }
        }
        .accessibilityHidden(true)
    }

    private func markFrame(date: Date) -> some View {
        let time = reduceMotion ? 0 : date.timeIntervalSinceReferenceDate
        let sweep = (time.truncatingRemainder(dividingBy: ChemVaultLoadingConfiguration.sweepDuration) / ChemVaultLoadingConfiguration.sweepDuration) * 360
        let breath = reduceMotion ? 1 : 1 + sin(time / ChemVaultLoadingConfiguration.breathDuration * 2 * .pi) * 0.025
        let accent = ChemVaultLoadingConfiguration.primaryColor(for: colorScheme)

        return ZStack {
            if showsTrack {
                Circle()
                    .stroke(accent.opacity(colorScheme == .dark ? 0.16 : 0.12), lineWidth: max(1, size * 0.035))
            }

            Circle()
                .trim(from: 0.05, to: 0.42)
                .stroke(
                    AngularGradient(
                        colors: [accent.opacity(0.08), accent, accent.opacity(0.18)],
                        center: .center
                    ),
                    style: StrokeStyle(lineWidth: max(1.5, size * (showsTrack ? 0.055 : 0.075)), lineCap: .round)
                )
                .rotationEffect(.degrees(sweep))
                .opacity(showsTrack ? 1 : 0.84)

            Circle()
                .trim(from: 0.58, to: 0.78)
                .stroke(accent.opacity(colorScheme == .dark ? 0.56 : 0.38), style: StrokeStyle(lineWidth: max(1, size * (showsTrack ? 0.028 : 0.045)), lineCap: .round))
                .rotationEffect(.degrees(-sweep * 0.62))
                .scaleEffect(breath)
                .opacity(showsTrack ? 1 : 0.72)

            ChemVaultLogoBadge(size: size * 0.58, shadowRadius: showsTrack ? 8 : 0)
                .scaleEffect(isVisible ? 1 : 0.92)
        }
        .opacity(isVisible ? 1 : 0)
    }
}

enum ChemVaultBrandAssets {
    static let backgroundImageName = "ChemVaultLoginBackground"
    static let logoImageName = "ChemVaultLogo"
    static let darkLogoImageName = "ChemVaultLogoDark"
    static let loginCardMaxWidth: CGFloat = 430
    static let loginWatermarkOpacity: Double = 0
    static let backgroundLockupText = "chemvault.science"
    static let backgroundLockupLogoSize: CGFloat = 48
    static let backgroundLockupTopSpacing: CGFloat = 118
}

struct ChemVaultBrandBackground: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .top) {
                LoginStyleBackground()
                LinearGradient(
                    colors: ChemVaultTheme.backgroundVeilColors(for: colorScheme),
                    startPoint: .top,
                    endPoint: .bottom
                )

                ChemVaultBackgroundLockup()
                    .padding(.top, backgroundLockupTopPadding(for: proxy.size))
                    .allowsHitTesting(false)
            }
        }
        .ignoresSafeArea()
    }

    private func backgroundLockupTopPadding(for size: CGSize) -> CGFloat {
        min(max(size.height * 0.12, ChemVaultBrandAssets.backgroundLockupTopSpacing), 156)
    }
}

private struct LoginStyleBackground: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        LinearGradient(
            colors: ChemVaultTheme.backgroundColors(for: colorScheme),
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}

private struct ChemVaultBackgroundLockup: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        VStack(spacing: 8) {
            ChemVaultAdaptiveLogoImage()
                .scaledToFit()
                .frame(
                    width: ChemVaultBrandAssets.backgroundLockupLogoSize,
                    height: ChemVaultBrandAssets.backgroundLockupLogoSize
                )
                .shadow(color: .black.opacity(0.08), radius: 9, x: 0, y: 4)

            Text(ChemVaultBrandAssets.backgroundLockupText)
                .font(.system(size: 20, weight: .regular))
                .foregroundStyle(ChemVaultTheme.lockupText(for: colorScheme))
        }
        .accessibilityHidden(true)
    }
}

struct ChemVaultLogoBadge: View {
    @Environment(\.colorScheme) private var colorScheme

    var size: CGFloat
    var shadowRadius: CGFloat = 8

    var body: some View {
        ChemVaultAdaptiveLogoImage()
            .scaledToFit()
            .frame(width: size, height: size)
            .background(ChemVaultTheme.logoBadgeBackground(for: colorScheme), in: Circle())
            .shadow(color: .black.opacity(shadowRadius > 0 ? ChemVaultTheme.logoShadowOpacity(for: colorScheme) : 0), radius: shadowRadius, x: 0, y: shadowRadius * 0.4)
    }
}

struct ChemVaultAdaptiveLogoImage: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        ChemVaultBundleImage(name: colorScheme == .dark ? ChemVaultBrandAssets.darkLogoImageName : ChemVaultBrandAssets.logoImageName)
    }
}

enum ChemVaultTheme {
    static func backgroundColors(for colorScheme: ColorScheme) -> [Color] {
        if colorScheme == .dark {
            return [
                Color(red: 6 / 255, green: 16 / 255, blue: 25 / 255),
                Color(red: 10 / 255, green: 24 / 255, blue: 36 / 255),
                Color(red: 3 / 255, green: 9 / 255, blue: 14 / 255)
            ]
        }
        return [
            Color(red: 241 / 255, green: 247 / 255, blue: 251 / 255),
            .white,
            Color(red: 230 / 255, green: 241 / 255, blue: 249 / 255)
        ]
    }

    static func backgroundVeilColors(for colorScheme: ColorScheme) -> [Color] {
        if colorScheme == .dark {
            return [
                .black.opacity(0.06),
                Color(red: 12 / 255, green: 35 / 255, blue: 52 / 255).opacity(0.26),
                .black.opacity(0.12)
            ]
        }
        return [
            .white.opacity(0.04),
            .white.opacity(0.24),
            .white.opacity(0.08)
        ]
    }

    static func lockupText(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark
            ? Color(red: 218 / 255, green: 235 / 255, blue: 246 / 255).opacity(0.78)
            : Color(red: 47 / 255, green: 78 / 255, blue: 104 / 255).opacity(0.72)
    }

    static func logoBadgeBackground(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark ? .white.opacity(0.08) : .white.opacity(0.7)
    }

    static func logoShadowOpacity(for colorScheme: ColorScheme) -> Double {
        colorScheme == .dark ? 0.34 : 0.08
    }

    static func loginCardBackground(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark
            ? Color(red: 12 / 255, green: 26 / 255, blue: 38 / 255).opacity(0.88)
            : .white.opacity(0.9)
    }

    static func loginCardStroke(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark
            ? Color(red: 124 / 255, green: 191 / 255, blue: 226 / 255).opacity(0.18)
            : .white.opacity(0.82)
    }

    static func loginShadow(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark
            ? .black.opacity(0.42)
            : Color(red: 28 / 255, green: 66 / 255, blue: 94 / 255).opacity(0.18)
    }

    static func brandText(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark
            ? Color(red: 230 / 255, green: 243 / 255, blue: 250 / 255)
            : Color(red: 35 / 255, green: 70 / 255, blue: 100 / 255)
    }

    static func secondaryText(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark
            ? Color(red: 182 / 255, green: 210 / 255, blue: 225 / 255)
            : Color(red: 82 / 255, green: 105 / 255, blue: 123 / 255)
    }

    static func mutedText(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark
            ? Color(red: 130 / 255, green: 164 / 255, blue: 184 / 255)
            : Color(red: 114 / 255, green: 132 / 255, blue: 146 / 255)
    }

    static func fieldBorder(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark
            ? Color(red: 78 / 255, green: 126 / 255, blue: 154 / 255).opacity(0.58)
            : Color(red: 206 / 255, green: 220 / 255, blue: 231 / 255)
    }

    static func fieldBackground(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark
            ? Color(red: 7 / 255, green: 18 / 255, blue: 28 / 255).opacity(0.78)
            : .white.opacity(0.96)
    }

    static func connectionBackground(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark
            ? Color(red: 9 / 255, green: 22 / 255, blue: 33 / 255).opacity(0.78)
            : .white.opacity(0.72)
    }

    static func primaryButtonColors(for colorScheme: ColorScheme) -> [Color] {
        if colorScheme == .dark {
            return [
                Color(red: 56 / 255, green: 169 / 255, blue: 1),
                Color(red: 18 / 255, green: 99 / 255, blue: 190 / 255)
            ]
        }
        return [
            ChemVaultLoadingConfiguration.primaryColor,
            Color(red: 14 / 255, green: 103 / 255, blue: 188 / 255)
        ]
    }

    static func errorText(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark
            ? Color(red: 1, green: 178 / 255, blue: 176 / 255)
            : Color(red: 156 / 255, green: 48 / 255, blue: 48 / 255)
    }

    static func errorBackground(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark
            ? Color(red: 92 / 255, green: 26 / 255, blue: 32 / 255).opacity(0.38)
            : Color(red: 1, green: 240 / 255, blue: 239 / 255)
    }
}

struct ChemVaultBundleImage: View {
    var name: String

    var body: some View {
#if os(macOS)
        if let image = ChemVaultBundleImages.nsImage(named: name) {
            Image(nsImage: image)
                .resizable()
        } else {
            Color.clear
        }
#elseif canImport(UIKit)
        if let image = ChemVaultBundleImages.uiImage(named: name) {
            Image(uiImage: image)
                .resizable()
        } else {
            Color.clear
        }
#else
        Color.clear
#endif
    }
}

private enum ChemVaultBundleImages {
#if os(macOS)
    static func nsImage(named name: String) -> NSImage? {
        if let url = Bundle.main.url(forResource: name, withExtension: "png") {
            return NSImage(contentsOf: url)
        }
        return NSImage(named: NSImage.Name(name))
    }
#elseif canImport(UIKit)
    static func uiImage(named name: String) -> UIImage? {
        if let url = Bundle.main.url(forResource: name, withExtension: "png") {
            return UIImage(contentsOfFile: url.path)
        }
        return UIImage(named: name)
    }
#endif
}
