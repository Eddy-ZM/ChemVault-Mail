import Foundation
import SwiftUI

struct AdminUsersView: View {
    @EnvironmentObject private var appEnvironment: AppEnvironment
    @State private var users: [AdminUserRow] = []
    @State private var total: Int?
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        List {
            if let total {
                Section {
                    LabeledContent("Total users", value: String(total))
                }
            }

            ForEach(users) { user in
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(user.displayName)
                            .font(.headline)
                        Spacer()
                        Text(user.statusLabel)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Text(user.email)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    HStack(spacing: 12) {
                        Label("\(user.accountCount ?? 0)", systemImage: "person.2")
                        Label("\(user.receiveEmailCount ?? 0)", systemImage: "tray.and.arrow.down")
                        Label("\(user.sendEmailCount ?? 0)", systemImage: "paperplane")
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
            } else if users.isEmpty && errorMessage == nil {
                ContentUnavailableView("Users", systemImage: "person.2", description: Text("No users loaded."))
            }
        }
        .navigationTitle("Users")
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
            let response: PagedListResponse<AdminUserRow> = try await appEnvironment.apiClient.get(
                "/user/list",
                query: [
                    URLQueryItem(name: "num", value: "1"),
                    URLQueryItem(name: "size", value: "30"),
                    URLQueryItem(name: "status", value: "-1"),
                    URLQueryItem(name: "timeSort", value: "0"),
                    URLQueryItem(name: "isDel", value: "0")
                ]
            )
            users = response.list
            total = response.total
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
