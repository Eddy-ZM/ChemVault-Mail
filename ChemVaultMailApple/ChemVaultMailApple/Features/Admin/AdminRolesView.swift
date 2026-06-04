import Foundation
import SwiftUI

struct AdminRolesView: View {
    @EnvironmentObject private var appEnvironment: AppEnvironment
    @State private var roles: [ChemVaultRole] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        List {
            ForEach(roles) { role in
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(role.name)
                            .font(.headline)
                        Spacer()
                        if role.isDefault == 1 {
                            Label("Default", systemImage: "checkmark.seal")
                                .font(.caption)
                                .foregroundStyle(.green)
                        }
                    }
                    if let description = role.description, !description.isEmpty {
                        Text(description)
                            .foregroundStyle(.secondary)
                    }
                    HStack(spacing: 12) {
                        if let sendType = role.sendType {
                            Label(sendType, systemImage: "paperplane")
                        }
                        if let sendCount = role.sendCount {
                            Label("\(sendCount)", systemImage: "number")
                        }
                        if let accountCount = role.accountCount {
                            Label("\(accountCount)", systemImage: "person.2")
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
            } else if roles.isEmpty && errorMessage == nil {
                ContentUnavailableView("Roles", systemImage: "key.horizontal", description: Text("No roles loaded."))
            }
        }
        .navigationTitle("Roles")
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
            roles = try await appEnvironment.apiClient.get("/role/list")
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
