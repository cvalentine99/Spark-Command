#!/usr/bin/env python3
"""
Spark REST API Simulator for DGX Spark Command Center
Provides mock endpoints for testing without a real Spark cluster
"""

from flask import Flask, jsonify, request
from prometheus_client import make_wsgi_app, Gauge, Counter, Histogram
from werkzeug.middleware.dispatcher import DispatcherMiddleware
import random
import time
import threading
import uuid
from datetime import datetime, timedelta

app = Flask(__name__)

# =============================================================================
# Prometheus Metrics
# =============================================================================
spark_apps_total = Gauge('spark_apps_total', 'Total number of Spark applications')
spark_apps_running = Gauge('spark_apps_running', 'Number of running applications')
spark_executors_total = Gauge('spark_executors_total', 'Total number of executors')
spark_cores_used = Gauge('spark_cores_used', 'Number of cores in use')
spark_memory_used = Gauge('spark_memory_used_bytes', 'Memory used in bytes')
spark_job_duration = Histogram('spark_job_duration_seconds', 'Job duration in seconds',
                               buckets=[10, 30, 60, 120, 300, 600, 1800, 3600])

# =============================================================================
# Simulated Data Store
# =============================================================================
applications = {}
completed_apps = []

def generate_app_id():
    return f"app-{datetime.now().strftime('%Y%m%d%H%M%S')}-{random.randint(1000, 9999)}"

def create_mock_application(name="PySpark Job", state="RUNNING"):
    app_id = generate_app_id()
    start_time = datetime.now() - timedelta(minutes=random.randint(1, 60))
    
    app = {
        "id": app_id,
        "name": name,
        "state": state,
        "startTime": start_time.isoformat(),
        "duration": int((datetime.now() - start_time).total_seconds() * 1000),
        "sparkUser": "dgx-admin",
        "completed": state == "FINISHED",
        "attempts": [{
            "attemptId": 1,
            "startTime": start_time.isoformat(),
            "endTime": None if state == "RUNNING" else datetime.now().isoformat(),
            "duration": int((datetime.now() - start_time).total_seconds() * 1000),
            "sparkUser": "dgx-admin",
            "completed": state == "FINISHED"
        }],
        "executors": random.randint(2, 8),
        "cores": random.randint(4, 20),
        "memoryPerExecutor": random.choice([4096, 8192, 16384]),
        "stages": {
            "total": random.randint(5, 20),
            "completed": random.randint(0, 15),
            "failed": random.randint(0, 2)
        },
        "tasks": {
            "total": random.randint(100, 1000),
            "completed": random.randint(50, 900),
            "failed": random.randint(0, 10)
        }
    }
    return app_id, app

# Initialize with some mock applications
for i in range(3):
    app_id, app = create_mock_application(
        name=random.choice(["ETL Pipeline", "ML Training", "Data Processing", "RAPIDS SQL Query"]),
        state="RUNNING"
    )
    applications[app_id] = app

for i in range(5):
    app_id, app = create_mock_application(
        name=random.choice(["Batch Job", "Analytics Query", "Feature Engineering"]),
        state="FINISHED"
    )
    completed_apps.append(app)

# =============================================================================
# Spark REST API Endpoints
# =============================================================================

@app.route('/v1/submissions/status/<submission_id>')
def get_submission_status(submission_id):
    """Get status of a submission"""
    if submission_id in applications:
        app = applications[submission_id]
        return jsonify({
            "action": "SubmissionStatusResponse",
            "driverState": app["state"],
            "serverSparkVersion": "3.5.0",
            "submissionId": submission_id,
            "success": True,
            "workerHostPort": "192.168.100.10:7078",
            "workerId": "worker-20241219-192.168.100.10-7078"
        })
    return jsonify({"success": False, "message": "Submission not found"}), 404

@app.route('/v1/submissions/create', methods=['POST'])
def create_submission():
    """Submit a new Spark application"""
    data = request.get_json() or {}
    app_name = data.get('appResource', 'Submitted Job')
    
    app_id, app = create_mock_application(name=app_name, state="RUNNING")
    applications[app_id] = app
    
    return jsonify({
        "action": "CreateSubmissionResponse",
        "message": f"Driver successfully submitted as {app_id}",
        "serverSparkVersion": "3.5.0",
        "submissionId": app_id,
        "success": True
    })

@app.route('/v1/submissions/kill/<submission_id>', methods=['POST'])
def kill_submission(submission_id):
    """Kill a running submission"""
    if submission_id in applications:
        app = applications.pop(submission_id)
        app["state"] = "KILLED"
        app["completed"] = True
        completed_apps.append(app)
        return jsonify({
            "action": "KillSubmissionResponse",
            "message": f"Kill request for {submission_id} submitted",
            "serverSparkVersion": "3.5.0",
            "submissionId": submission_id,
            "success": True
        })
    return jsonify({"success": False, "message": "Submission not found"}), 404

# =============================================================================
# Spark UI API Endpoints (port 8080)
# =============================================================================

@app.route('/api/v1/applications')
def list_applications():
    """List all applications"""
    all_apps = list(applications.values()) + completed_apps[-10:]
    return jsonify(all_apps)

@app.route('/api/v1/applications/<app_id>')
def get_application(app_id):
    """Get application details"""
    if app_id in applications:
        return jsonify(applications[app_id])
    for app in completed_apps:
        if app["id"] == app_id:
            return jsonify(app)
    return jsonify({"error": "Application not found"}), 404

@app.route('/api/v1/applications/<app_id>/jobs')
def get_application_jobs(app_id):
    """Get jobs for an application"""
    jobs = []
    for i in range(random.randint(3, 10)):
        jobs.append({
            "jobId": i,
            "name": f"Job {i}",
            "submissionTime": datetime.now().isoformat(),
            "completionTime": datetime.now().isoformat() if random.random() > 0.3 else None,
            "stageIds": list(range(random.randint(1, 5))),
            "status": random.choice(["SUCCEEDED", "RUNNING", "FAILED"]),
            "numTasks": random.randint(10, 100),
            "numActiveTasks": random.randint(0, 10),
            "numCompletedTasks": random.randint(50, 90),
            "numFailedTasks": random.randint(0, 5)
        })
    return jsonify(jobs)

@app.route('/api/v1/applications/<app_id>/stages')
def get_application_stages(app_id):
    """Get stages for an application"""
    stages = []
    for i in range(random.randint(5, 15)):
        stages.append({
            "stageId": i,
            "attemptId": 0,
            "name": f"Stage {i}",
            "status": random.choice(["COMPLETE", "ACTIVE", "PENDING"]),
            "numTasks": random.randint(10, 100),
            "numActiveTasks": random.randint(0, 10),
            "numCompleteTasks": random.randint(50, 90),
            "numFailedTasks": random.randint(0, 2),
            "executorRunTime": random.randint(1000, 60000),
            "inputBytes": random.randint(1000000, 1000000000),
            "outputBytes": random.randint(1000000, 500000000),
            "shuffleReadBytes": random.randint(0, 100000000),
            "shuffleWriteBytes": random.randint(0, 100000000)
        })
    return jsonify(stages)

@app.route('/api/v1/applications/<app_id>/executors')
def get_application_executors(app_id):
    """Get executors for an application"""
    executors = [{
        "id": "driver",
        "hostPort": "192.168.100.10:42000",
        "isActive": True,
        "rddBlocks": 0,
        "memoryUsed": random.randint(100000000, 500000000),
        "diskUsed": 0,
        "totalCores": 4,
        "maxTasks": 4,
        "activeTasks": random.randint(0, 4),
        "failedTasks": 0,
        "completedTasks": random.randint(10, 100),
        "totalTasks": random.randint(10, 100),
        "totalDuration": random.randint(10000, 100000),
        "totalGCTime": random.randint(100, 1000),
        "totalInputBytes": random.randint(1000000, 100000000),
        "totalShuffleRead": random.randint(0, 50000000),
        "totalShuffleWrite": random.randint(0, 50000000),
        "maxMemory": 4294967296
    }]
    
    for i in range(random.randint(2, 6)):
        executors.append({
            "id": str(i),
            "hostPort": f"192.168.100.{10 + (i % 2)}:{42000 + i}",
            "isActive": True,
            "rddBlocks": random.randint(0, 10),
            "memoryUsed": random.randint(500000000, 2000000000),
            "diskUsed": random.randint(0, 1000000000),
            "totalCores": 4,
            "maxTasks": 4,
            "activeTasks": random.randint(0, 4),
            "failedTasks": random.randint(0, 2),
            "completedTasks": random.randint(50, 500),
            "totalTasks": random.randint(50, 500),
            "totalDuration": random.randint(50000, 500000),
            "totalGCTime": random.randint(500, 5000),
            "totalInputBytes": random.randint(10000000, 1000000000),
            "totalShuffleRead": random.randint(0, 500000000),
            "totalShuffleWrite": random.randint(0, 500000000),
            "maxMemory": 8589934592
        })
    
    return jsonify(executors)

@app.route('/metrics/prometheus')
def prometheus_metrics():
    """Prometheus metrics endpoint"""
    # Update metrics
    spark_apps_total.set(len(applications) + len(completed_apps))
    spark_apps_running.set(len(applications))
    spark_executors_total.set(sum(app.get("executors", 0) for app in applications.values()))
    spark_cores_used.set(sum(app.get("cores", 0) for app in applications.values()))
    spark_memory_used.set(sum(app.get("memoryPerExecutor", 0) * app.get("executors", 0) * 1024 * 1024 
                              for app in applications.values()))
    
    return "# Spark metrics available at /metrics\n"

@app.route('/health')
def health():
    return jsonify({"status": "healthy", "service": "spark-simulator"})

# =============================================================================
# Background thread to simulate job progress
# =============================================================================
def update_jobs():
    while True:
        time.sleep(5)
        for app_id, app in list(applications.items()):
            # Update progress
            if app["stages"]["completed"] < app["stages"]["total"]:
                app["stages"]["completed"] += 1
            if app["tasks"]["completed"] < app["tasks"]["total"]:
                app["tasks"]["completed"] += random.randint(5, 20)
                app["tasks"]["completed"] = min(app["tasks"]["completed"], app["tasks"]["total"])
            
            # Random completion
            if random.random() < 0.05:
                app["state"] = "FINISHED"
                app["completed"] = True
                completed_apps.append(applications.pop(app_id))
                spark_job_duration.observe(app["duration"] / 1000)
        
        # Random new job
        if len(applications) < 5 and random.random() < 0.1:
            app_id, app = create_mock_application(
                name=random.choice(["ETL Pipeline", "ML Training", "Data Processing", "RAPIDS SQL"]),
                state="RUNNING"
            )
            applications[app_id] = app

# Start background thread
threading.Thread(target=update_jobs, daemon=True).start()

# =============================================================================
# WSGI Application with Prometheus metrics
# =============================================================================
app.wsgi_app = DispatcherMiddleware(app.wsgi_app, {
    '/metrics': make_wsgi_app()
})

if __name__ == '__main__':
    print("Starting Spark REST API Simulator...")
    print("  REST API: http://0.0.0.0:6066")
    print("  Spark UI: http://0.0.0.0:8080")
    app.run(host='0.0.0.0', port=6066, threaded=True)
