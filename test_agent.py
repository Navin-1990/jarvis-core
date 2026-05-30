from app.brain.orchestrator import Orchestrator

jarvis = Orchestrator()

request = input("You: ")

result = jarvis.execute(request)

print()
print("Result:")
print(result)