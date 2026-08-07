import Foundation

struct CareAPIClient {
    enum APIError: LocalizedError {
        case invalidServerURL
        case invalidResponse
        case requestFailed(Int)
        case serverMessage(String)

        var errorDescription: String? {
            switch self {
            case .invalidServerURL:
                "The server address is not valid."
            case .invalidResponse:
                "Smart Pillbox received an unexpected response."
            case .requestFailed(let statusCode):
                "Smart Pillbox could not reach the server (\(statusCode))."
            case .serverMessage(let message):
                message
            }
        }
    }

    let baseURL: URL
    let deviceID: String
    var session: URLSession = .shared

    init(serverURL: String, deviceID: String) throws {
        let trimmed = serverURL.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = URL(string: trimmed), url.scheme != nil, url.host != nil else {
            throw APIError.invalidServerURL
        }
        baseURL = url
        self.deviceID = deviceID
    }

    func fetchEvents() async throws -> [HardwareEvent] {
        let response: HardwareEventsResponse = try await get(
            path: "/api/hardware/events",
            queryItems: [
                URLQueryItem(name: "deviceId", value: deviceID),
                URLQueryItem(name: "limit", value: "100"),
            ]
        )
        return response.events
    }

    func connectPillbox(connectCode: String) async throws -> PillboxConnectionResponse {
        try await post(
            path: "/api/pillbox/connect",
            body: PillboxConnectionRequest(connectCode: connectCode)
        )
    }

    func fetchDeviceState() async throws -> HardwareDeviceState {
        try await get(
            path: "/api/hardware/state",
            queryItems: [URLQueryItem(name: "deviceId", value: deviceID)]
        )
    }

    func fetchMedicationPlan() async throws -> [MedicationSlot] {
        let response: HardwarePlanResponse = try await get(
            path: "/api/hardware/plan",
            queryItems: [URLQueryItem(name: "deviceId", value: deviceID)]
        )
        return response.slots.filter { !$0.medication.trimmingCharacters(in: .whitespaces).isEmpty }
    }

    func fetchUserProfile() async throws -> CaregiverProfile {
        let response: CaregiverProfileResponse = try await get(
            path: "/api/profile",
            queryItems: []
        )
        return response.profile
    }

    func fetchInsightReport(patientID: String) async throws -> CaregiverInsightReport {
        let response: CaregiverInsightReportResponse = try await get(
            path: "/api/caregiver-insight",
            queryItems: [URLQueryItem(name: "patientId", value: patientID)]
        )
        return response.report
    }

    func generateInsight(
        report: CaregiverInsightReport,
        patientName: String
    ) async throws -> GeneratedCaregiverInsightResponse {
        try await post(
            path: "/api/caregiver-insight",
            body: CaregiverInsightRequest(
                report: report,
                section: "key_insight",
                patientName: patientName
            )
        )
    }

    func updateMedicationPlan(
        _ slots: [MedicationSlot]
    ) async throws -> [MedicationSlot] {
        let response: HardwarePlanResponse = try await post(
            path: "/api/hardware/plan",
            body: HardwarePlanUpdateRequest(deviceId: deviceID, slots: slots)
        )
        return response.slots
    }

    func updateUserProfile(
        fullName: String,
        email: String,
        phone: String,
        role: String
    ) async throws -> CaregiverProfile {
        let response: CaregiverProfileResponse = try await put(
            path: "/api/profile",
            body: CaregiverProfileUpdateRequest(
                fullName: fullName,
                email: email,
                phone: phone,
                role: role
            )
        )
        return response.profile
    }

    private func get<Response: Decodable>(
        path: String,
        queryItems: [URLQueryItem]
    ) async throws -> Response {
        guard var components = URLComponents(
            url: baseURL.appendingPathComponent(path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))),
            resolvingAgainstBaseURL: false
        ) else {
            throw APIError.invalidServerURL
        }

        components.queryItems = queryItems
        guard let url = components.url else { throw APIError.invalidServerURL }

        var request = URLRequest(url: url)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.timeoutInterval = 8

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        guard 200..<300 ~= httpResponse.statusCode else {
            throw APIError.requestFailed(httpResponse.statusCode)
        }

        return try JSONDecoder().decode(Response.self, from: data)
    }

    private func post<Body: Encodable, Response: Decodable>(
        path: String,
        body: Body
    ) async throws -> Response {
        let url = baseURL.appendingPathComponent(
            path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        )
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.timeoutInterval = 30
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        guard 200..<300 ~= httpResponse.statusCode else {
            if let payload = try? JSONDecoder().decode(APIErrorResponse.self, from: data),
               let message = payload.error {
                throw APIError.serverMessage(message)
            }
            throw APIError.requestFailed(httpResponse.statusCode)
        }

        return try JSONDecoder().decode(Response.self, from: data)
    }

    private func put<Body: Encodable, Response: Decodable>(
        path: String,
        body: Body
    ) async throws -> Response {
        let url = baseURL.appendingPathComponent(
            path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        )
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.timeoutInterval = 30
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        guard 200..<300 ~= httpResponse.statusCode else {
            if let payload = try? JSONDecoder().decode(APIErrorResponse.self, from: data),
               let message = payload.error {
                throw APIError.serverMessage(message)
            }
            throw APIError.requestFailed(httpResponse.statusCode)
        }

        return try JSONDecoder().decode(Response.self, from: data)
    }
}

private struct CaregiverInsightRequest: Encodable {
    let report: CaregiverInsightReport
    let section: String
    let patientName: String
}

private struct HardwarePlanUpdateRequest: Encodable {
    let deviceId: String
    let slots: [MedicationSlot]
}

private struct PillboxConnectionRequest: Encodable {
    let connectCode: String
}

private struct CaregiverProfileResponse: Decodable {
    let profile: CaregiverProfile
}

private struct CaregiverProfileUpdateRequest: Encodable {
    let fullName: String
    let email: String
    let phone: String
    let role: String
}

private struct APIErrorResponse: Decodable {
    let error: String?
}
