import SwiftUI

struct SystemSettingsView: View {
    @EnvironmentObject private var appEnvironment: AppEnvironment
    @EnvironmentObject private var preferences: AppPreferences
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var settings: ChemVaultSetting?
    @State private var rawSettings: JSONValue?
    @State private var isLoading = false
    @State private var isSavingAPIBaseURL = false
    @State private var apiBaseURLDraft = AppPreferences.defaultBaseURL
    @State private var errorMessage: String?
    @State private var statusMessage: String?

    var body: some View {
        List {
            if let settings {
                Section("Website") {
                    LabeledContent("Title", value: settings.title ?? "")
                    LabeledContent("Send", value: settings.send.map(String.init) ?? "")
                    LabeledContent("Receive", value: settings.receive.map(String.init) ?? "")
                    LabeledContent("Register", value: settings.register.map(String.init) ?? "")
                    LabeledContent("R2 Domain", value: settings.r2Domain ?? "")
                }
            }

            Section("Global API") {
                LabeledContent {
                    Text(managedAPIBaseURL)
                        .multilineTextAlignment(.trailing)
                        .textSelection(.enabled)
                } label: {
                    Label("Managed Endpoint", systemImage: "network")
                }

                TextField("https://mail.chemvault.science/api", text: $apiBaseURLDraft)
                    .font(.system(.body, design: .monospaced))
                    .autocorrectionDisabled()
                    .textSelection(.enabled)

                HStack {
                    Button {
                        saveGlobalAPIBaseURL()
                    } label: {
                        if isSavingAPIBaseURL {
                            ChemVaultLoadingButtonLabel(title: "Saving", size: 16)
                        } else {
                            Label("Save Global API", systemImage: "checkmark.shield.fill")
                        }
                    }
                    .disabled(normalizedDraftBaseURL == nil || isSavingAPIBaseURL)

                    Spacer()

                    Button {
                        saveGlobalAPIBaseURL(AppPreferences.defaultBaseURL)
                    } label: {
                        Label("Production", systemImage: "server.rack")
                    }
                    .disabled(isSavingAPIBaseURL)
                }

                Label("Synced to native app users", systemImage: "arrow.triangle.2.circlepath")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(ChemVaultLoadingConfiguration.primaryColor(for: colorScheme))
            }

            if let rawSettings {
                Section("Raw Settings") {
                    Text(rawSettings.description)
                        .font(.caption)
                        .textSelection(.enabled)
                }
            }

            if let statusMessage {
                Section {
                    Label(statusMessage, systemImage: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                }
                .transition(.opacity.combined(with: .scale(scale: 0.98)).combined(with: .offset(y: -8)))
            }

            if let errorMessage {
                Section {
                    Label(errorMessage, systemImage: "exclamationmark.triangle.fill")
                        .foregroundStyle(ChemVaultTheme.errorText(for: colorScheme))
                }
                .transition(.opacity.combined(with: .scale(scale: 0.98)).combined(with: .offset(y: -8)))
            }
        }
        .overlay {
            if isLoading {
                ProgressView()
                    .transition(.opacity.combined(with: .scale(scale: 0.96)))
            }
        }
        .navigationTitle("System Settings")
        .toolbar {
            Button {
                Task { await load() }
            } label: {
                Label("Refresh", systemImage: "arrow.clockwise")
            }
        }
        .task { await load() }
        .animation(reduceMotion ? nil : ChemVaultMotion.depthShift, value: isLoading)
        .animation(reduceMotion ? nil : ChemVaultMotion.depthShift, value: isSavingAPIBaseURL)
        .animation(reduceMotion ? nil : ChemVaultMotion.depthShift, value: statusMessage)
        .animation(reduceMotion ? nil : ChemVaultMotion.depthShift, value: errorMessage)
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        do {
            let loadedSettings: ChemVaultSetting = try await appEnvironment.apiClient.get("/setting/query")
            settings = loadedSettings
            preferences.applyGlobalBaseURLIfPresent(loadedSettings.appleApiBaseURL)
            apiBaseURLDraft = AppPreferences.normalizedBaseURL(loadedSettings.appleApiBaseURL) ?? preferences.baseURLString
            rawSettings = try? await appEnvironment.apiClient.rawGet("/setting/query")
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private var managedAPIBaseURL: String {
        AppPreferences.normalizedBaseURL(settings?.appleApiBaseURL) ?? preferences.baseURLString
    }

    private var normalizedDraftBaseURL: String? {
        AppPreferences.normalizedBaseURL(apiBaseURLDraft)
    }

    private func saveGlobalAPIBaseURL(_ value: String? = nil) {
        let draft = value ?? apiBaseURLDraft
        guard let normalized = AppPreferences.normalizedBaseURL(draft) else {
            errorMessage = "Enter a valid http or https API URL."
            statusMessage = nil
            return
        }

        isSavingAPIBaseURL = true
        errorMessage = nil
        Task {
            do {
                try await appEnvironment.apiClient.setGlobalAPIBaseURL(normalized)
                preferences.setAdminManagedBaseURL(normalized)
                apiBaseURLDraft = normalized
                settings?.appleApiBaseURL = normalized
                statusMessage = "Global API server updated."
            } catch {
                errorMessage = error.localizedDescription
                statusMessage = nil
            }
            isSavingAPIBaseURL = false
        }
    }
}
