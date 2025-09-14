from project_scanner import scan_project

# The scan_project function always includes 'AgentTraeCreated/Rephrasing/project_scanner.py'
# and 'AgentTraeCreated/Rephrasing/question_optimizer.py' in its analysis.
# Pass the root directory containing these files as project_path.
def optimize_questions(project_path, user_questions):
    project_info = scan_project(project_path)
    optimized_questions = []
    for question in user_questions:
        # Exemple simple : éviter de demander la création d'une fonction déjà existante
        if "créer une fonction" in question:
            func_name = question.split("créer une fonction ")[-1].split()[0]
            if any(func_name in info['functions'] for info in project_info.values()):
                continue  # Fonction déjà présente, question ignorée
        optimized_questions.append(question)
    return optimized_questions
