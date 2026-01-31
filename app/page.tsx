"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { getDownloadUrl, isPlatformAvailable } from "@/lib/app-distribution";

const techShots = [
  {
    tag: "System Design",
    text: "Redis sorted sets enable O(log N) leaderboards at scale",
  },
  { tag: "Backend", text: "Connection pooling reduces DB latency by 10x" },
  {
    tag: "Performance",
    text: "HTTP/2 multiplexing eliminates head-of-line blocking",
  },
  { tag: "Infra", text: "Kubernetes HPA scales pods on custom metrics" },
  { tag: "APIs", text: "GraphQL fragments prevent over-fetching at scale" },
  { tag: "Database", text: "B-tree indexes make range queries blazingly fast" },
];

export default function LandingPage() {
  return (
    <div style={{ background: "#09090b", minHeight: "100vh", color: "#fff" }}>
      {/* Navbar */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: "20px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backdropFilter: "blur(12px)",
          background: "rgba(9,9,11,0.8)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <span style={{ fontSize: "20px", fontWeight: 700 }}>TL;Dev</span>
        <motion.a
          href="#download"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: "10px 24px",
            background: "#fff",
            color: "#000",
            borderRadius: "999px",
            fontWeight: 600,
            fontSize: "14px",
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          Download
        </motion.a>
      </nav>

      {/* Hero Section */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "120px 20px 80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "800px",
            height: "800px",
            background:
              "radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "999px",
            marginBottom: "32px",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              background: "#00D4FF",
              borderRadius: "50%",
            }}
            className="animate-pulse-glow"
          />
          <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)" }}>
            Now available on iOS & Android
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          style={{
            fontSize: "clamp(48px, 10vw, 96px)",
            fontWeight: 800,
            textAlign: "center",
            letterSpacing: "-0.03em",
            lineHeight: 1,
            marginBottom: "16px",
          }}
        >
          Be ∞× Dev.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          style={{
            fontSize: "clamp(24px, 5vw, 48px)",
            fontWeight: 500,
            textAlign: "center",
            color: "rgba(255,255,255,0.5)",
            marginBottom: "24px",
          }}
        >
          Learn Engineering in One Shot.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          style={{
            fontSize: "18px",
            textAlign: "center",
            color: "rgba(255,255,255,0.4)",
            maxWidth: "600px",
            lineHeight: 1.6,
            marginBottom: "48px",
          }}
        >
          Daily tech shots trained on the best articles, research papers, and
          real system design knowledge — no fluff.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          style={{
            display: "flex",
            gap: "16px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <motion.a
            href={getDownloadUrl("ios")}
            onClick={(e) => {
              if (!isPlatformAvailable("ios")) {
                e.preventDefault();
                alert("iOS build coming soon! Check back in a few minutes.");
              }
            }}
            whileHover={{
              scale: 1.03,
              boxShadow: "0 0 40px rgba(255,255,255,0.2)",
            }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "16px 32px",
              background: isPlatformAvailable("ios")
                ? "#fff"
                : "rgba(255,255,255,0.3)",
              color: isPlatformAvailable("ios") ? "#000" : "#666",
              borderRadius: "999px",
              fontWeight: 600,
              fontSize: "16px",
              textDecoration: "none",
              cursor: isPlatformAvailable("ios") ? "pointer" : "not-allowed",
              opacity: isPlatformAvailable("ios") ? 1 : 0.6,
            }}
          >
            <AppleIcon />
            Download on iOS
          </motion.a>
          <motion.a
            href={getDownloadUrl("android")}
            onClick={(e) => {
              if (!isPlatformAvailable("android")) {
                e.preventDefault();
                alert(
                  "Android build coming soon! Check back in a few minutes."
                );
              }
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "16px 32px",
              background: isPlatformAvailable("android")
                ? "rgba(255,255,255,0.05)"
                : "rgba(255,255,255,0.02)",
              color: isPlatformAvailable("android") ? "#fff" : "#666",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "999px",
              fontWeight: 600,
              fontSize: "16px",
              textDecoration: "none",
              cursor: isPlatformAvailable("android")
                ? "pointer"
                : "not-allowed",
              opacity: isPlatformAvailable("android") ? 1 : 0.6,
            }}
          >
            <PlayStoreIcon />
            Get it on Android
          </motion.a>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          style={{
            position: "absolute",
            bottom: "40px",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              width: "24px",
              height: "40px",
              border: "2px solid rgba(255,255,255,0.2)",
              borderRadius: "12px",
              display: "flex",
              justifyContent: "center",
              paddingTop: "8px",
            }}
          >
            <div
              style={{
                width: "4px",
                height: "8px",
                background: "rgba(255,255,255,0.4)",
                borderRadius: "2px",
              }}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* App Preview Section */}
      <section
        style={{
          padding: "100px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          style={{ textAlign: "center", marginBottom: "60px" }}
        >
          <span
            style={{
              display: "inline-block",
              padding: "6px 14px",
              background: "rgba(0,212,255,0.1)",
              color: "#00D4FF",
              borderRadius: "999px",
              fontSize: "14px",
              fontWeight: 500,
              marginBottom: "20px",
            }}
          >
            The Feed
          </span>
          <h2
            style={{
              fontSize: "clamp(32px, 6vw, 56px)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              marginBottom: "16px",
            }}
          >
            Learn the way your brain likes it
          </h2>
          <p
            style={{
              fontSize: "18px",
              color: "rgba(255,255,255,0.5)",
              maxWidth: "500px",
              margin: "0 auto",
            }}
          >
            Fast, visual, and to the point. One powerful insight that sticks.
          </p>
        </motion.div>

        {/* Phone Mockup with Real Screenshot */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          style={{
            position: "relative",
            padding: "12px",
            background: "linear-gradient(145deg, #1a1a1d 0%, #09090b 100%)",
            borderRadius: "44px",
            boxShadow: `
              0 50px 100px -20px rgba(0, 0, 0, 0.7),
              0 0 0 1px rgba(255, 255, 255, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.1),
              0 0 80px rgba(0, 212, 255, 0.15)
            `,
          }}
        >
          {/* Phone frame highlight */}
          <div
            style={{
              position: "absolute",
              top: "0",
              left: "20%",
              right: "20%",
              height: "1px",
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
            }}
          />

          {/* Screen container */}
          <div
            style={{
              borderRadius: "36px",
              overflow: "hidden",
              background: "#09090b",
            }}
          >
            <img
              src="/app-screenshot.png"
              alt="TL;Dev App Screenshot"
              style={{
                width: "300px",
                height: "auto",
                display: "block",
              }}
            />
          </div>
        </motion.div>
      </section>

      {/* How It Works */}
      <section
        style={{
          padding: "100px 20px",
          background:
            "linear-gradient(180deg, transparent 0%, rgba(0,212,255,0.02) 50%, transparent 100%)",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            style={{ textAlign: "center", marginBottom: "60px" }}
          >
            <span
              style={{
                display: "inline-block",
                padding: "6px 14px",
                background: "rgba(0,212,255,0.1)",
                color: "#00D4FF",
                borderRadius: "999px",
                fontSize: "14px",
                fontWeight: 500,
                marginBottom: "20px",
              }}
            >
              How It Works
            </span>
            <h2
              style={{
                fontSize: "clamp(32px, 6vw, 56px)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              Three steps to 10x your knowledge
            </h2>
          </motion.div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "24px",
            }}
          >
            {[
              {
                num: "01",
                title: "AI-Curated Shots",
                desc: "Trained on the best articles, papers, and system design knowledge.",
              },
              {
                num: "02",
                title: "One Shot. One Insight.",
                desc: "No tutorials. No distractions. Just signal.",
              },
              {
                num: "03",
                title: "Daily Push. Lifetime Skill.",
                desc: "One shot a day. Compounds forever.",
              },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                whileHover={{ y: -8 }}
                style={{
                  padding: "32px",
                  background: "rgba(24,24,27,0.5)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: "20px",
                  cursor: "default",
                }}
              >
                <span
                  style={{
                    fontSize: "48px",
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.1)",
                    display: "block",
                    marginBottom: "16px",
                  }}
                >
                  {step.num}
                </span>
                <h3
                  style={{
                    fontSize: "20px",
                    fontWeight: 600,
                    marginBottom: "8px",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontSize: "15px",
                    color: "rgba(255,255,255,0.5)",
                    lineHeight: 1.6,
                  }}
                >
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Topics Section */}
      <section style={{ padding: "100px 20px" }}>
        <div
          style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}
        >
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            style={{
              fontSize: "clamp(24px, 4vw, 36px)",
              fontWeight: 600,
              marginBottom: "40px",
              lineHeight: 1.4,
            }}
          >
            Built for developers who care about architecture, performance, and
            real-world engineering.
          </motion.h2>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              justifyContent: "center",
            }}
          >
            {[
              "Backend",
              "System Design",
              "Infra",
              "Performance",
              "Architecture",
              "Database",
            ].map((tag) => (
              <motion.span
                key={tag}
                whileHover={{ scale: 1.05 }}
                style={{
                  padding: "10px 20px",
                  background: "#18181b",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "999px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.7)",
                  cursor: "default",
                }}
              >
                {tag}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section
        id="download"
        style={{
          padding: "120px 20px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "600px",
            height: "600px",
            background:
              "radial-gradient(circle, rgba(0,212,255,0.1) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            maxWidth: "800px",
            margin: "0 auto",
            textAlign: "center",
            position: "relative",
          }}
        >
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            style={{
              fontSize: "clamp(36px, 7vw, 64px)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              marginBottom: "16px",
            }}
          >
            Stop doom-scrolling.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            style={{
              fontSize: "clamp(24px, 5vw, 40px)",
              fontWeight: 500,
              color: "rgba(255,255,255,0.4)",
              marginBottom: "48px",
            }}
          >
            Start compounding engineering knowledge.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{
              display: "flex",
              gap: "16px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <motion.a
              href="#"
              whileHover={{
                scale: 1.03,
                boxShadow: "0 0 60px rgba(255,255,255,0.25)",
              }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "18px 36px",
                background: "#fff",
                color: "#000",
                borderRadius: "999px",
                fontWeight: 600,
                fontSize: "18px",
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              <AppleIcon />
              Download on iOS
            </motion.a>
            <motion.a
              href="#"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "18px 36px",
                background: "rgba(255,255,255,0.05)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "999px",
                fontWeight: 600,
                fontSize: "18px",
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              <PlayStoreIcon />
              Get it on Android
            </motion.a>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: "24px 40px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "16px", fontWeight: 700 }}>TL;Dev</span>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
          <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)" }}>
            One-shot tech learning
          </span>
        </div>
        <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.3)" }}>
          © 2026 TL;Dev. All rights reserved.
        </span>
      </footer>
    </div>
  );
}

function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function PlayStoreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
    </svg>
  );
}
