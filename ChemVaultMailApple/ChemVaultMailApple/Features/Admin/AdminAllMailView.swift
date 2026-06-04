import Foundation
import SwiftUI

struct AdminAllMailView: View {
    @EnvironmentObject private var appEnvironment: AppEnvironment
    @State private var emails: [ChemVaultEmail] = []
    @State private var total: Int?
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        List {
            if let total {
                Section {
                    LabeledContent("Total messages", value: String(total))
                }
            }

            ForEach(emails) { email in
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(email.title)
                            .font(.headline)
                            .lineLimit(1)
                        Spacer()
                        Text(email.type == 1 ? "Sent" : "Received")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Text(email.senderLine)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    HStack(spacing: 12) {
                        if let userEmail = email.userEmail {
                            Label(userEmail, systemImage: "person")
                        }
                        if let createTime = email.createTime {
                            Label(createTime, systemImage: "clock")
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
            } else if emails.isEmpty && errorMessage == nil {
                ContentUnavailableView("All Mail", systemImage: "archivebox", description: Text("No messages loaded."))
            }
        }
        .navigationTitle("All Mail")
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
            let response: MailListResponse = try await appEnvironment.apiClient.get(
                "/allEmail/list",
                query: [
                    URLQueryItem(name: "emailId", value: "0"),
                    URLQueryItem(name: "size", value: "30"),
                    URLQueryItem(name: "timeSort", value: "0")
                ]
            )
            emails = response.list
            total = response.total
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
