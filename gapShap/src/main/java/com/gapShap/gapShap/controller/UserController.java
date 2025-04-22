package com.gapShap.gapShap.controller;

import com.gapShap.gapShap.model.User;
import com.gapShap.gapShap.service.UserService;

import jakarta.servlet.http.Cookie;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@RestController
public class UserController {

    private final UserService userService;

    @Autowired
    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/")
    public String home() {
        return "Welcome to GapShap! <a href='/dashboard'>Go to Dashboard</a>";
    }
    @GetMapping("/api/user")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal OidcUser principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        
        // Save or update user in the database
        String authId = principal.getSubject();
        String name = principal.getClaim("name");
        String email = principal.getEmail();
        String pictureUrl = principal.getClaim("picture");

        User user = userService.saveOrUpdateUser(authId, name, email, pictureUrl);

        Map<String, Object> response = new HashMap<>();
        response.put("userId", user.getId());
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("picture", user.getPictureUrl());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard(@AuthenticationPrincipal OidcUser principal) {
        // Save or update user in the database
        String authId = principal.getSubject();
        String name = principal.getClaim("name");
        String email = principal.getEmail();
        String pictureUrl = principal.getClaim("picture");

        User user = userService.saveOrUpdateUser(authId, name, email, pictureUrl);

        Map<String, Object> response = new HashMap<>();
        response.put("userId", user.getId());
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("picture", user.getPictureUrl());
        return response;
    }
    // @GetMapping("/logout")
    // public Map<String, String> logout(HttpServletRequest request, HttpServletResponse response) {
    //     // Invalidate the session
    //     HttpSession session = request.getSession(false);
    //     if (session != null) {
    //         session.invalidate();
    //     }

    //     // Clear Spring Security context
    //     SecurityContextHolder.clearContext();

    //     // Update returnTo URL to point to frontend
    //     String logoutUrl = "https://dev-4pm565a3cspyz0h6.us.auth0.com/v2/logout?client_id=STcoA62Iv2l7D7Nz54xQ9hfoIrTBvTJD&returnTo=http://localhost:3000/";

    //     Map<String, String> result = new HashMap<>();
    //     result.put("message", "Successfully logged out");
    //     result.put("logoutUrl", logoutUrl);

    //     return result;
    // }
    @PostMapping("/api/logout")  // Note: using the same path as in SecurityConfig
    public Map<String, String> logout(HttpServletRequest request, HttpServletResponse response) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                Cookie newCookie = new Cookie(cookie.getName(), null);
                newCookie.setMaxAge(0);
                newCookie.setPath("/");
                response.addCookie(newCookie);
            }
        }
        // Invalidate the session
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }

        // Clear Spring Security context
        SecurityContextHolder.clearContext();

        // Construct correct Auth0 logout URL
        String logoutUrl = "https://dev-4pm565a3cspyz0h6.us.auth0.com/v2/logout"
            + "?client_id=STcoA62Iv2l7D7Nz54xQ9hfoIrTBvTJD"
            + "&returnTo=http://localhost:3000/"
            + "&federated"; // This is the key addition!
        Map<String, String> result = new HashMap<>();
        result.put("message", "Successfully logged out");
        result.put("logoutUrl", logoutUrl);

        return result;
    }

    @GetMapping("/public/hello")
    public String publicEndpoint() {
        return "This is a public endpoint that doesn't require authentication";
    }
    @GetMapping("/api/users")
    public ResponseEntity<?> getAllUsers(@AuthenticationPrincipal OidcUser principal,
                                        @RequestParam(required = false) String query) {
        if (principal == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        
        User currentUser = userService.findUserByAuthId(principal.getSubject())
            .orElseThrow(() -> new NoSuchElementException("User not found"));
        
        List<User> users;
        if (query != null && !query.isEmpty()) {
            // Search users by name or email if query is provided
            users = userService.searchUsers(query);
        } else {
            // Return all users if no query
            users = userService.findAllUsers();
        }
        
        // Filter out the current user from results
        List<Map<String, Object>> response = users.stream()
            .filter(user -> !user.getId().equals(currentUser.getId()))
            .map(user -> {
                Map<String, Object> userMap = new HashMap<>();
                userMap.put("id", user.getId());
                userMap.put("name", user.getName());
                userMap.put("email", user.getEmail());
                userMap.put("pictureUrl", user.getPictureUrl());
                return userMap;
            })
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(response);
    }
}