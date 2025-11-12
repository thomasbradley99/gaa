
import yaml

def get_deps_from_file(filename):
    with open(filename, 'r') as f:
        env = yaml.safe_load(f)
    
    conda_deps = set()
    pip_deps = set()
    
    for dep in env.get('dependencies', []):
        if isinstance(dep, str):
            conda_deps.add(dep.split('=')[0])
        elif isinstance(dep, dict) and 'pip' in dep:
            for pip_dep in dep['pip']:
                pip_deps.add(pip_dep.split('==')[0])
                
    return conda_deps, pip_deps

def main():
    ball_conda, ball_pip = get_deps_from_file('ball.yml')
    tracker_conda, tracker_pip = get_deps_from_file('gaa-tracker.yml')

    missing_conda = ball_conda - tracker_conda
    missing_pip = ball_pip - tracker_pip

    with open('conda_requirements.txt', 'w') as f:
        for pkg in sorted(list(missing_conda)):
             if pkg not in ['prtreid', 'sam-2', 'python']:
                f.write(f"{pkg}\n")

    with open('pip_requirements.txt', 'w') as f:
        for pkg in sorted(list(missing_pip)):
             if pkg not in ['prtreid', 'sam-2']:
                f.write(f"{pkg}\n")

    print("Generated conda_requirements.txt and pip_requirements.txt with missing packages.")

if __name__ == "__main__":
    main() 