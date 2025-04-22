package com.gapShap.gapShap.config;

import java.util.Arrays;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtDecoders;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
       http
       .sessionManagement(session -> session
            .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
            .invalidSessionUrl("/")
            .maximumSessions(1)
            .expiredUrl("/")
        )
        .authorizeHttpRequests(authz -> authz
            .requestMatchers("/", "/public/**", "/api/logout").permitAll() // Add logout to permitAll
            .anyRequest().authenticated()
        )
        .oauth2Login(Customizer.withDefaults())
        .oauth2Login(oauth2 -> oauth2
            .defaultSuccessUrl("http://localhost:3000/auth-success", true)
        )
        .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
        .csrf(csrf -> csrf.disable())
        .cors(Customizer.withDefaults())
        .logout(logout -> logout
            .logoutUrl("/api/logout")
            .logoutSuccessHandler((request, response, authentication) -> {
                // Clear the JSESSIONID cookie explicitly
                Cookie cookie = new Cookie("JSESSIONID", null);
                cookie.setMaxAge(0);
                cookie.setPath("/");
                cookie.setSecure(true);
                cookie.setHttpOnly(true);
                response.addCookie(cookie);
                
                // Return JSON response
                response.setContentType("application/json");
                response.setStatus(HttpServletResponse.SC_OK);
                response.getWriter().write("{\"message\":\"Successfully logged out\",\"logoutUrl\":\"https://dev-4pm565a3cspyz0h6.us.auth0.com/v2/logout?client_id=STcoA62Iv2l7D7Nz54xQ9hfoIrTBvTJD&returnTo=http://localhost:3000/&federated\"}");
            })
            .invalidateHttpSession(true)
            .clearAuthentication(true)
            // Remove this line as we're manually handling cookie deletion
            // .deleteCookies("JSESSIONID")
        );
    return http.build();
}

    // Add CORS configuration bean
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.asList("http://localhost:3000")); // React app origin
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With"));
        config.setAllowCredentials(true); // Important for cookies/auth
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public OAuth2UserService<OidcUserRequest, OidcUser> oidcUserService() {
        return new OidcUserService();
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        return JwtDecoders.fromIssuerLocation("https://dev-4pm565a3cspyz0h6.us.auth0.com/");
    }
}

// Removed duplicate filterChain method to resolve the error