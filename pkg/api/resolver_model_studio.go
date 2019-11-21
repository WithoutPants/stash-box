package api

import (
	"context"
	"strconv"

	"github.com/stashapp/stashdb/pkg/models"
)

type studioResolver struct{ *Resolver }

func (r *studioResolver) ID(ctx context.Context, obj *models.Studio) (string, error) {
	return strconv.FormatInt(obj.ID, 10), nil
}

func (r *studioResolver) Urls(ctx context.Context, obj *models.Studio) ([]*models.URL, error) {
	qb := models.NewStudioQueryBuilder()
	urls, err := qb.GetUrls(obj.ID)

	if err != nil {
		return nil, err
	}

	var ret []*models.URL
	for _, url := range urls {
		retURL := url.ToURL()
		ret = append(ret, &retURL)
	}

	return ret, nil
}

func (r *studioResolver) Parent(ctx context.Context, obj *models.Studio) (*models.Studio, error) {
	if !obj.ParentStudioID.Valid {
		return nil, nil
	}

	qb := models.NewStudioQueryBuilder()
	parent, err := qb.Find(int(obj.ParentStudioID.Int64))

	if err != nil {
		return nil, err
	}

	return parent, nil
}

func (r *studioResolver) ChildStudios(ctx context.Context, obj *models.Studio) ([]*models.Studio, error) {
	qb := models.NewStudioQueryBuilder()
	children, err := qb.FindByParentID(obj.ID, nil)

	if err != nil {
		return nil, err
	}

	return children, nil
}
