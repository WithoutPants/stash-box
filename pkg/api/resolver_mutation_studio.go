package api

import (
	"context"
	"strconv"
	"time"

	"github.com/stashapp/stashdb/pkg/database"
	"github.com/stashapp/stashdb/pkg/models"
)

func (r *mutationResolver) StudioCreate(ctx context.Context, input models.StudioCreateInput) (*models.Studio, error) {
	if err := validateModify(ctx); err != nil {
		return nil, err
	}

	var err error

	if err != nil {
		return nil, err
	}

	// Populate a new studio from the input
	currentTime := time.Now()
	newStudio := models.Studio{
		CreatedAt: models.SQLiteTimestamp{Timestamp: currentTime},
		UpdatedAt: models.SQLiteTimestamp{Timestamp: currentTime},
	}

	newStudio.CopyFromCreateInput(input)

	// Start the transaction and save the studio
	tx := database.DB.MustBeginTx(ctx, nil)
	qb := models.NewStudioQueryBuilder()
	studio, err := qb.Create(newStudio, tx)
	if err != nil {
		_ = tx.Rollback()
		return nil, err
	}

	// TODO - save child studios

	// Save the URLs
	studioUrls := models.CreateStudioUrls(studio.ID, input.Urls)
	if err := qb.CreateUrls(studioUrls, tx); err != nil {
		_ = tx.Rollback()
		return nil, err
	}

	// Commit
	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return studio, nil
}

func (r *mutationResolver) StudioUpdate(ctx context.Context, input models.StudioUpdateInput) (*models.Studio, error) {
	if err := validateModify(ctx); err != nil {
		return nil, err
	}

	qb := models.NewStudioQueryBuilder()

	// get the existing studio and modify it
	studioID, _ := strconv.Atoi(input.ID)
	updatedStudio, err := qb.Find(studioID)

	if err != nil {
		return nil, err
	}

	updatedStudio.UpdatedAt = models.SQLiteTimestamp{Timestamp: time.Now()}

	// Start the transaction and save the studio
	tx := database.DB.MustBeginTx(ctx, nil)

	// Populate studio from the input
	updatedStudio.CopyFromUpdateInput(input)

	studio, err := qb.Update(*updatedStudio, tx)
	if err != nil {
		_ = tx.Rollback()
		return nil, err
	}

	// Save the URLs
	// TODO - only do this if provided
	studioUrls := models.CreateStudioUrls(studio.ID, input.Urls)
	if err := qb.UpdateUrls(studio.ID, studioUrls, tx); err != nil {
		_ = tx.Rollback()
		return nil, err
	}

	// TODO - handle child studios

	// Commit
	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return studio, nil
}

func (r *mutationResolver) StudioDestroy(ctx context.Context, input models.StudioDestroyInput) (bool, error) {
	if err := validateModify(ctx); err != nil {
		return false, err
	}

	qb := models.NewStudioQueryBuilder()
	tx := database.DB.MustBeginTx(ctx, nil)

	// references have on delete cascade, so shouldn't be necessary
	// to remove them explicitly

	studioID, err := strconv.ParseInt(input.ID, 10, 64)
	if err != nil {
		return false, err
	}
	if err = qb.Destroy(studioID, tx); err != nil {
		_ = tx.Rollback()
		return false, err
	}

	if err := tx.Commit(); err != nil {
		return false, err
	}
	return true, nil
}
