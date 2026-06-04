import Foundation
import SwiftUI

struct AdminRegistrationKeysView: View {
    @EnvironmentObject private var appEnvironment: AppEnvironment
    @State private var keys: [RegistrationKey] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        List {
            ForEach(keys) { key in
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(key.code)
                            .font(.headline)
                            .textSelection(.enabled)
                        Spacer()
                        Text("\(key.count ?? 0) left")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    HStack(spacing: 12) {
                        if let roleName = key.roleName, !roleName.isEmpty {
                            Label(roleName, systemImage: "key.horizontal")
                        }
                        if let expireTime = key.expireTime {
                            Label(expireTime, systemImage: "calendar")
                        }
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
                .padding(.vertical, 4)
            }

            if let errorMessage {
                Section {
                    Text(errorMessage)
                        .foregroundStyle(.red)
                }
            }
        }
        .overlay {
            if isLoading {
                ProgressView()
            } else if keys.isEmpty && errorMessage == nil {
                ContentUnavailableView("Registration Keys", systemImage: "ticket", description: Text("No registration keys loaded."))
            }
        }
        .navigationTitle("Registration Keys")
        .toolbar {
            Button {
                Task { await load() }
            } label: {
                Label("Refresh", systemImage: "arrow.clockwise")
            }
        }
        .task { await load() }
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        do {
            keys = try await appEnvironment.apiClient.get("/regKey/list")
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
