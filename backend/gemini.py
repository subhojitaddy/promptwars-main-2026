import os
import logging
from typing import List, Dict
from google import genai
from google.genai import types

# Setup logger
logger = logging.getLogger("mindfulflow.gemini")

# Initialize client
api_key = os.environ.get("GEMINI_API_KEY")

client = None
if api_key and api_key != "your_gemini_api_key_here":
    try:
        # Client automatically loads GEMINI_API_KEY from environment
        client = genai.Client()
        logger.info("Google GenAI client initialized successfully.")
    except Exception as e:
        logger.error(f"Error initializing Google GenAI client: {e}")
else:
    logger.warning("GEMINI_API_KEY is not set or is using the template default. Running in Mock/Simulated mode.")

def get_coaching_response(chat_history: List[Dict[str, str]], user_message: str, habits_summary: str) -> str:
    """
    Generate an empathetic, CBT-based habit-coaching response using Gemini.
    """
    system_instruction = (
        "You are MindfulFlow Coach, a compassionate and expert behavioral coach specializing in "
        "Cognitive Behavioral Therapy (CBT) and behavioral economics (micro-habits, nudges). "
        "Your goal is to help the user reduce or overcome harmful habits (like excessive screen time, "
        "junk food, smoking, procrastination) and build healthy routines.\n\n"
        "Guidance:\n"
        "- Be empathetic, non-judgmental, and constructive.\n"
        "- Ask thoughtful questions to help the user identify their triggers, underlying feelings, or barriers.\n"
        "- Suggest small, actionable, 'micro-steps' rather than massive behavioral shifts.\n"
        "- Use CBT concepts (identifying cognitive distortions, cognitive reframing) where appropriate.\n"
        f"- Here is a summary of the user's active habits: {habits_summary}.\n"
        "Keep responses relatively brief (2-4 paragraphs max) and focus on one next step."
    )

    if not client:
        return simulate_coaching_response(user_message, habits_summary)

    try:
        # Build contents from history
        contents = []
        for msg in chat_history:
            role = "user" if msg["sender"] == "user" else "model"
            contents.append(types.Content(
                role=role,
                parts=[types.Part.from_text(text=msg["text"])]
            ))
        
        # Append the new user message
        contents.append(types.Content(
            role="user",
            parts=[types.Part.from_text(text=user_message)]
        ))

        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.7,
            max_output_tokens=800,
        )

        response = client.models.generate_content(
            model="gemini-flash-latest",
            contents=contents,
            config=config
        )
        return response.text
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return f"I'm here to support you, but I ran into a connection error ({str(e)}). Let's focus on taking a deep breath and identifying what trigger you are experiencing right now."

def generate_nudge(habit_name: str, streak: int, trigger_summary: str) -> str:
    """
    Generate a dynamic, intelligent micro-nudge (simulated notification).
    """
    prompt = (
        f"Create a short, positive, motivational reminder (nudge) for someone trying to overcome the habit: '{habit_name}'.\n"
        f"Their current streak is {streak} days.\n"
        f"Some of their common triggers are: {trigger_summary or 'general fatigue or boredom'}.\n"
        "Guidelines:\n"
        "- Keep it under 150 characters (suitable for an in-app banner/push notification).\n"
        "- Do not use generic phrases. Be warm, clever, and action-oriented.\n"
        "- Do not include hashtags or quotes around the nudge."
    )

    if not client:
        return f"Keep going! Your {streak}-day streak for '{habit_name}' is worth protecting. You've got this!"

    try:
        response = client.models.generate_content(
            model="gemini-flash-latest",
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.8, max_output_tokens=100)
        )
        return response.text.strip().replace('"', '')
    except Exception as e:
        logger.error(f"Gemini Nudge error: {e}")
        return f"Mindful check-in: Protecting your progress on '{habit_name}' starts with this very moment."

def generate_grounding_exercise(habit_name: str, mood: str) -> str:
    """
    Generate an immediate grounding exercise for distress or strong craving.
    """
    prompt = (
        f"The user is experiencing a severe craving or trigger for '{habit_name}'.\n"
        f"Their current reported mood is '{mood}'.\n"
        "Generate a brief, high-impact grounding exercise to help them get through the next 5 minutes without slipping.\n"
        "Include:\n"
        "1. A direct, soothing acknowledgment of their craving and mood.\n"
        "2. A quick, sensory grounding step (e.g. 3-2-1 technique or physical mindfulness action).\n"
        "3. A gentle self-reflection question.\n"
        "Keep the entire output brief, structured with clear bullet points, and highly encouraging. Avoid verbose text."
    )

    if not client:
        return (
            f"### Pause & Reset\n\n"
            f"It's completely okay to feel a craving for **{habit_name}** right now, especially since you are feeling **{mood}**.\n\n"
            f"**The 3-3-3 Rule:**\n"
            f"- Look around and name 3 things you can see.\n"
            f"- Listen closely and name 3 sounds you can hear.\n"
            f"- Touch 3 physical textures nearby (e.g., your desk, clothes, or cold water).\n\n"
            f"**Reflect:** What is this craving trying to tell you? Can we give ourselves 5 minutes before deciding?"
        )

    try:
        response = client.models.generate_content(
            model="gemini-flash-latest",
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.5, max_output_tokens=400)
        )
        return response.text
    except Exception as e:
        logger.error(f"Gemini Grounding error: {e}")
        return "Deep breath. Sit comfortably. Place your feet flat on the floor. Feel the ground support you. Let this craving pass over like a wave. You are stronger than this 5-minute urge."

def simulate_coaching_response(user_message: str, habits_summary: str) -> str:
    """
    Simulated CBT coach response when API key is missing.
    """
    # Simple rule-based mock responses for demo purposes
    msg_lower = user_message.lower()
    if "hello" in msg_lower or "hi" in msg_lower:
        return (
            "Hi there! Welcome to MindfulFlow. I am your AI Coach. I help you explore habits and build healthier "
            "coping mechanisms. How are you feeling today, and what habit are we working on together?"
        )
    elif "trigger" in msg_lower or "stress" in msg_lower or "bored" in msg_lower:
        return (
            "It sounds like you've identified a key trigger. In Cognitive Behavioral Therapy (CBT), we look at "
            "the cycle: Trigger -> Thought -> Behavior -> Reward. When you feel bored or stressed, what is the immediate "
            "thought that comes up? Identifying that thought is the first step to reframing it. Can we brainstorm "
            "a small, 2-minute alternative activity to replace the habit in that moment?"
        )
    elif "slip" in msg_lower or "relapse" in msg_lower or "failed" in msg_lower or "broke" in msg_lower:
        return (
            "Please don't be hard on yourself. Behavioral change is never a straight line; it is a spiral of learning. "
            "A slip is not a failure—it's valuable data. Let's look at it objectively: What was happening right before the slip? "
            "Who were you with, how were you feeling, and what was the environment? Let's use this to adjust our plan for next time."
        )
    else:
        return (
            "Thank you for sharing that. It takes courage to look at our habits honestly. Let's take a micro-step today. "
            "If you could adjust just one thing about your routine tomorrow—even something that takes less than 5 minutes—what "
            "would feel most achievable? Let's talk about how to set that up."
        )
